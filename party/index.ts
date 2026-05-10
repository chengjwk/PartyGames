import type * as Party from "partykit/server";
import type {
  ClientMessage,
  GameStats,
  Player,
  PrivatePlayerState,
  PublicGameState,
  RoundConfig,
  RoundSummary,
  ScoredWord,
  ServerMessage,
} from "../src/shared/types";
import { DEFAULT_CONFIG } from "../src/shared/types";
import { generatePuzzle, type Puzzle } from "./puzzle";
import { validateWord, scoreWord } from "./scoring";
import pangramDefs from "./data/pangram-defs.json";

const COUNTDOWN_MS = 3000;
const PAUSE_GRACE_MS = 3000;
const BEE_DEPARTED_GRACE_MS = 5000;
// Bee cadence: 15s wait, 15s bee, repeat. So a 60s round gets 2 bees
// (15-30, 45-60); a 90s round gets 3 (15-30, 45-60, 75-90).
const BEE_FIRST_OFFSET_MS = 15_000;
const BEE_DURATION_MS = 15_000;
const BEE_INTERVAL_MS = 30_000;

export default class WordHiveServer implements Party.Server {
  // Player records keyed by stable clientId (from localStorage on the phone).
  private players = new Map<string, Player>();
  // Insertion order for host fallback (Map preserves it; we also use it to
  // pick the next host when the current one disconnects).
  private joinOrder: string[] = [];
  // connection.id -> clientId so onClose knows who's leaving.
  private connToClient = new Map<string, string>();
  // Connections that opened the room as host (e.g. via /host page).
  private hostConns = new Set<string>();

  // Game state
  private phase: PublicGameState["phase"] = "LOBBY";
  private config: RoundConfig = { ...DEFAULT_CONFIG };
  private currentRound = 0;
  private hostPlayerId: string | null = null;
  private totalScores = new Map<string, number>();
  private puzzle: Puzzle | null = null;
  private roundStartsAt: number | null = null;
  private roundEndsAt: number | null = null;
  private foundByPlayer = new Map<string, ScoredWord[]>();
  private firstFinder = new Map<string, string>();
  private roundSummary: RoundSummary | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  // Pause state — true when frozen waiting for a disconnected player.
  private paused = false;
  private pauseRemainingMs: number | null = null;
  private pauseGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedAt: number | null = null;
  // Bee bonus: schedule of upcoming bees (sorted), plus current bee state.
  private beeSchedule: Array<{ arriveAt: number; leaveAt: number; letter: string }> = [];
  private beeTimer: ReturnType<typeof setTimeout> | null = null;
  private beeLetter: string | null = null;
  private beeUntilMs: number | null = null;
  // Recently-departed bees stay valid for a short grace so a queued submit
  // doesn't fail just because the bee left a beat ago.
  private recentBees: Array<{ letter: string; expiresAt: number }> = [];
  private gameStats: GameStats = { longest: null, highest: null };
  private lastPangramAt: number | null = null;
  // word -> definition (or null if API confirmed no entry). Persists across
  // rounds in a given room; pangrams repeat often enough that this saves work.
  // Pre-populated from build-time pangram-defs.json so seed pangrams render
  // instantly without a runtime fetch.
  private definitionCache = new Map<string, string | null>(
    Object.entries(pangramDefs as Record<string, string>),
  );

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const role = new URL(ctx.request.url).searchParams.get("role") ?? "player";
    if (role === "host") this.hostConns.add(conn.id);

    this.send(conn, { type: "you", playerId: conn.id });
    this.send(conn, { type: "state", state: this.snapshot() });
  }

  onClose(conn: Party.Connection) {
    this.hostConns.delete(conn.id);
    const clientId = this.connToClient.get(conn.id);
    if (!clientId) return;
    this.connToClient.delete(conn.id);

    const stillHere = [...this.connToClient.values()].includes(clientId);
    if (!stillHere) {
      const p = this.players.get(clientId);
      if (p) p.connected = false;
      if (this.hostPlayerId === clientId) {
        this.hostPlayerId = this.electHost();
      }
      this.maybeSchedulePause();
    }
    this.broadcastState();
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg);
        return;
      case "rename":
        this.handleRename(sender, msg);
        return;
      case "setAvatar":
        this.handleSetAvatar(sender, msg);
        return;
      case "setHandicap":
        if (this.isHost(sender)) this.handleSetHandicap(msg);
        return;
      case "configure":
        if (this.isHost(sender)) this.handleConfigure(msg);
        return;
      case "startGame":
        if (this.isHost(sender)) this.handleStartGame();
        return;
      case "submitWord":
        this.handleSubmit(sender, msg);
        return;
      case "nextRound":
        if (this.isHost(sender)) this.handleNextRound();
        return;
      case "playAgain":
        if (this.isHost(sender)) this.handlePlayAgain();
        return;
      case "skipWait":
        if (this.isHost(sender)) this.forceResume();
        return;
      case "togglePause":
        this.handleTogglePause();
        return;
      case "resetGame":
        this.handleResetGame();
        return;
    }
  }

  // ---------- handlers ----------

  private handleJoin(
    sender: Party.Connection,
    msg: { name: string; avatar: string; clientId: string },
  ) {
    const name = sanitizeName(msg.name);
    if (!name || !msg.clientId) {
      this.send(sender, { type: "error", message: "Name and clientId required." });
      return;
    }
    const existing = this.players.get(msg.clientId);
    if (existing) {
      existing.name = name;
      if (msg.avatar) existing.avatar = msg.avatar;
      existing.connected = true;
    } else {
      this.players.set(msg.clientId, {
        id: msg.clientId,
        name,
        avatar: msg.avatar || "🦊",
        scoreMultiplier: 1,
        connected: true,
      });
      this.joinOrder.push(msg.clientId);
      this.totalScores.set(msg.clientId, this.totalScores.get(msg.clientId) ?? 0);
    }
    this.connToClient.set(sender.id, msg.clientId);

    // First connected player becomes host.
    if (!this.hostPlayerId || !this.players.get(this.hostPlayerId)?.connected) {
      this.hostPlayerId = this.electHost();
    }

    // If we were paused waiting for someone to reconnect, see if we can resume.
    this.maybeResume();

    this.broadcastState();
    this.sendPrivate(sender);
  }

  private handleRename(sender: Party.Connection, msg: { name: string }) {
    const clientId = this.connToClient.get(sender.id);
    if (!clientId) return;
    const player = this.players.get(clientId);
    if (!player) return;
    const name = sanitizeName(msg.name);
    if (!name) return;
    player.name = name;
    this.broadcastState();
  }

  private handleSetAvatar(sender: Party.Connection, msg: { avatar: string }) {
    const clientId = this.connToClient.get(sender.id);
    if (!clientId) return;
    const player = this.players.get(clientId);
    if (!player) return;
    if (!msg.avatar) return;
    player.avatar = msg.avatar;
    this.broadcastState();
  }

  private handleSetHandicap(msg: { playerId: string; multiplier: number }) {
    const player = this.players.get(msg.playerId);
    if (!player) return;
    const m = Math.max(1, Math.min(3, msg.multiplier || 1));
    player.scoreMultiplier = m;
    this.broadcastState();
  }

  private handleConfigure(msg: { config: Partial<RoundConfig> }) {
    if (this.phase !== "LOBBY") return;
    const next = { ...this.config };
    if (typeof msg.config.totalRounds === "number") {
      next.totalRounds = clamp(Math.round(msg.config.totalRounds), 1, 10);
    }
    if (typeof msg.config.roundDurationSeconds === "number") {
      next.roundDurationSeconds = clamp(
        Math.round(msg.config.roundDurationSeconds),
        15,
        600,
      );
    }
    if (typeof msg.config.easyMode === "boolean") {
      next.easyMode = msg.config.easyMode;
    }
    this.config = next;
    this.broadcastState();
  }

  private handleStartGame() {
    if (this.phase !== "LOBBY") return;
    if (this.players.size === 0) return;
    this.totalScores.clear();
    for (const cid of this.players.keys()) this.totalScores.set(cid, 0);
    this.currentRound = 0;
    this.gameStats = { longest: null, highest: null };
    this.beginCountdown();
  }

  // Three-second pause before the round actually begins, so everyone has time
  // to look up at the puzzle.
  private beginCountdown() {
    this.currentRound += 1;
    this.puzzle = generatePuzzle();
    this.foundByPlayer.clear();
    this.firstFinder.clear();
    this.roundSummary = null;
    this.roundEndsAt = null;
    this.lastPangramAt = null;
    this.roundStartsAt = Date.now() + COUNTDOWN_MS;
    this.phase = "ROUND_STARTING";

    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = setTimeout(() => this.beginRound(), COUNTDOWN_MS);

    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private beginRound() {
    if (this.phase !== "ROUND_STARTING") return;
    this.roundStartsAt = null;
    const durMs = this.config.roundDurationSeconds * 1000;
    const now = Date.now();
    this.roundEndsAt = now + durMs;
    this.phase = "ROUND_PLAYING";

    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => this.endRound(), durMs);

    this.buildBeeSchedule(now, durMs);
    this.scheduleNextBeeEvent();

    this.broadcastState();
  }

  private buildBeeSchedule(roundStart: number, durMs: number) {
    this.beeSchedule = [];
    if (!this.puzzle) return;
    const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
    const outside = ALPHABET.filter((l) => !this.puzzle!.letterSet.has(l));
    for (let t = BEE_FIRST_OFFSET_MS; t + BEE_DURATION_MS <= durMs; t += BEE_INTERVAL_MS) {
      // Bee carries a brand-new 8th letter, sampled per-arrival (with replacement).
      const letter = outside[Math.floor(Math.random() * outside.length)];
      this.beeSchedule.push({
        arriveAt: roundStart + t,
        leaveAt: roundStart + t + BEE_DURATION_MS,
        letter,
      });
    }
  }

  private scheduleNextBeeEvent() {
    if (this.beeTimer) clearTimeout(this.beeTimer);
    this.beeTimer = null;

    // If a bee is currently active, schedule its departure.
    if (this.beeLetter && this.beeUntilMs) {
      const ms = this.beeUntilMs - Date.now();
      if (ms <= 0) {
        this.beeLeaves();
      } else {
        this.beeTimer = setTimeout(() => this.beeLeaves(), ms);
      }
      return;
    }

    // Otherwise schedule the next arrival, if any.
    const next = this.beeSchedule[0];
    if (!next) return;
    const ms = next.arriveAt - Date.now();
    if (ms <= 0) {
      this.beeArrives();
    } else {
      this.beeTimer = setTimeout(() => this.beeArrives(), ms);
    }
  }

  private beeArrives() {
    const next = this.beeSchedule.shift();
    if (!next) return;
    this.beeLetter = next.letter;
    this.beeUntilMs = next.leaveAt;
    this.broadcastState();
    this.scheduleNextBeeEvent();
  }

  private beeLeaves() {
    if (this.beeLetter) {
      this.recentBees.push({
        letter: this.beeLetter,
        expiresAt: Date.now() + BEE_DEPARTED_GRACE_MS,
      });
    }
    this.beeLetter = null;
    this.beeUntilMs = null;
    this.broadcastState();
    this.scheduleNextBeeEvent();
  }

  private clearBee() {
    if (this.beeTimer) {
      clearTimeout(this.beeTimer);
      this.beeTimer = null;
    }
    this.beeLetter = null;
    this.beeUntilMs = null;
    this.beeSchedule = [];
    this.recentBees = [];
  }

  private endRound() {
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle) return;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    this.clearBee();

    const perPlayer = [...this.players.values()].map((p) => {
      const words = this.foundByPlayer.get(p.id) ?? [];
      const scoreThisRound = words.reduce((s, w) => s + w.points, 0);
      return { playerId: p.id, words, scoreThisRound };
    });
    for (const r of perPlayer) {
      this.totalScores.set(
        r.playerId,
        (this.totalScores.get(r.playerId) ?? 0) + r.scoreThisRound,
      );
    }

    const pangrams = [...this.puzzle.pangrams].sort();
    this.roundSummary = {
      letters: this.puzzle.letters,
      pangrams,
      perPlayer,
      definitions: {},
    };
    this.roundEndsAt = null;
    this.phase = "ROUND_RESULTS";
    this.broadcastState();

    // Fire-and-forget: fetch definitions, then update + rebroadcast. If the
    // host advances before defs arrive, the second broadcast is a no-op.
    this.loadDefinitions(pangrams).catch(() => {});
  }

  private async loadDefinitions(words: string[]) {
    const defs: Record<string, string> = {};
    await Promise.all(
      words.map(async (w) => {
        let def = this.definitionCache.get(w);
        if (def === undefined) def = await fetchDefinition(w);
        this.definitionCache.set(w, def);
        if (def) defs[w] = def;
      }),
    );
    if (this.phase !== "ROUND_RESULTS" && this.phase !== "FINAL_RESULTS") return;
    if (!this.roundSummary) return;
    this.roundSummary = { ...this.roundSummary, definitions: defs };
    this.broadcastState();
  }

  private handleNextRound() {
    if (this.phase !== "ROUND_RESULTS") return;
    if (this.currentRound >= this.config.totalRounds) {
      this.phase = "FINAL_RESULTS";
      this.broadcastState();
      return;
    }
    this.beginCountdown();
  }

  private handlePlayAgain() {
    if (this.phase !== "FINAL_RESULTS") return;
    this.phase = "LOBBY";
    this.currentRound = 0;
    this.totalScores.clear();
    this.puzzle = null;
    this.foundByPlayer.clear();
    this.firstFinder.clear();
    this.roundSummary = null;
    this.roundStartsAt = null;
    this.roundEndsAt = null;
    this.paused = false;
    this.pauseRemainingMs = null;
    this.pausedAt = null;
    if (this.pauseGraceTimer) {
      clearTimeout(this.pauseGraceTimer);
      this.pauseGraceTimer = null;
    }
    this.clearBee();
    this.gameStats = { longest: null, highest: null };
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private handleSubmit(sender: Party.Connection, msg: { word: string }) {
    const clientId = this.connToClient.get(sender.id);
    if (!clientId) return;
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle || this.paused) {
      this.send(sender, {
        type: "submitResult",
        word: msg.word,
        ok: false,
        reason: "not_in_round",
      });
      return;
    }

    const now = Date.now();
    this.recentBees = this.recentBees.filter((r) => r.expiresAt > now);
    const extraLetters = new Set<string>();
    if (this.beeLetter) extraLetters.add(this.beeLetter);
    for (const r of this.recentBees) extraLetters.add(r.letter);
    const result = validateWord(msg.word, this.puzzle, extraLetters);
    if (!result.ok) {
      this.send(sender, {
        type: "submitResult",
        word: msg.word,
        ok: false,
        reason: result.reason,
      });
      return;
    }

    const found = this.foundByPlayer.get(clientId) ?? [];
    if (found.some((w) => w.word === result.word)) {
      this.send(sender, {
        type: "submitResult",
        word: result.word,
        ok: false,
        reason: "already_found",
      });
      return;
    }

    const isFirstFinder = !this.firstFinder.has(result.word);
    if (isFirstFinder) this.firstFinder.set(result.word, clientId);

    const player = this.players.get(clientId);
    const playerMult = player?.scoreMultiplier ?? 1;
    const usedBonus = result.word.includes(this.puzzle.bonusLetter);
    // True if the word used any letter that's not in the puzzle's 7 (i.e. came
    // from the active bee or one in its grace period).
    const usedBee = [...result.word].some(
      (ch) => !this.puzzle!.letterSet.has(ch),
    );
    let m = 1;
    if (usedBonus) m *= 2;
    m *= playerMult;
    const base = scoreWord({
      word: result.word,
      isPangram: result.isPangram,
      firstFinder: isFirstFinder,
    });
    const scored: ScoredWord = {
      ...base,
      points: Math.round(base.points * m),
      bonusLetter: usedBonus,
      beeBonus: usedBee,
    };
    found.push(scored);
    this.foundByPlayer.set(clientId, found);

    if (scored.isPangram) this.lastPangramAt = Date.now();

    // Update game-wide bests; ties go to the first to find.
    if (
      !this.gameStats.longest ||
      result.word.length > this.gameStats.longest.word.length
    ) {
      this.gameStats.longest = { word: result.word, playerId: clientId };
    }
    if (
      !this.gameStats.highest ||
      scored.points > this.gameStats.highest.points
    ) {
      this.gameStats.highest = {
        word: result.word,
        points: scored.points,
        playerId: clientId,
      };
    }

    this.send(sender, {
      type: "submitResult",
      word: result.word,
      ok: true,
      points: scored.points,
      isPangram: scored.isPangram,
      firstFinder: scored.firstFinder,
    });
    this.sendPrivate(sender);
    if (this.config.easyMode) this.broadcastState();
  }

  // ---------- pause / resume ----------

  // Called whenever a player's connection state changes to disconnected.
  // Schedules an actual pause after a short grace period — brief network
  // glitches won't constantly freeze the game.
  private maybeSchedulePause() {
    if (this.phase !== "ROUND_PLAYING") return; // only pause active rounds
    if (this.paused) return;
    if (this.pauseGraceTimer) return;
    this.pauseGraceTimer = setTimeout(() => {
      this.pauseGraceTimer = null;
      // Re-check: did everyone reconnect during grace?
      const anyDown = [...this.players.values()].some((p) => !p.connected);
      if (!anyDown) return;
      if (this.phase !== "ROUND_PLAYING") return;
      this.doPause();
    }, PAUSE_GRACE_MS);
  }

  private doPause() {
    if (!this.roundEndsAt) return;
    const now = Date.now();
    this.pauseRemainingMs = Math.max(0, this.roundEndsAt - now);
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.beeTimer) {
      clearTimeout(this.beeTimer);
      this.beeTimer = null;
    }
    this.roundEndsAt = null;
    this.paused = true;
    this.pausedAt = now;
    this.broadcastState();
  }

  // Cancel a pending grace timer (someone reconnected) and resume if we're
  // paused and everyone is back.
  private maybeResume() {
    if (this.pauseGraceTimer) {
      clearTimeout(this.pauseGraceTimer);
      this.pauseGraceTimer = null;
    }
    if (!this.paused) return;
    const anyDown = [...this.players.values()].some((p) => !p.connected);
    if (anyDown) return;
    this.resume();
  }

  private forceResume() {
    if (!this.paused) return;
    this.resume();
  }

  // Manual pause toggle from any client. Only meaningful during play.
  private handleTogglePause() {
    if (this.phase !== "ROUND_PLAYING") return;
    if (this.paused) {
      this.resume();
    } else {
      this.doPause();
    }
  }

  // Bail back to lobby from any in-game phase. Players keep their slots
  // (and avatars/names) but scores reset like a brand-new game.
  private handleResetGame() {
    if (this.phase === "LOBBY") return;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    if (this.pauseGraceTimer) {
      clearTimeout(this.pauseGraceTimer);
      this.pauseGraceTimer = null;
    }
    this.clearBee();
    this.phase = "LOBBY";
    this.currentRound = 0;
    this.totalScores.clear();
    this.puzzle = null;
    this.foundByPlayer.clear();
    this.firstFinder.clear();
    this.roundSummary = null;
    this.roundStartsAt = null;
    this.roundEndsAt = null;
    this.paused = false;
    this.pauseRemainingMs = null;
    this.pausedAt = null;
    this.gameStats = { longest: null, highest: null };
    this.lastPangramAt = null;
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private resume() {
    if (!this.paused) return;
    const remaining = this.pauseRemainingMs ?? 0;
    const now = Date.now();
    const pauseDuration = this.pausedAt ? now - this.pausedAt : 0;
    this.paused = false;
    this.pauseRemainingMs = null;
    this.pausedAt = null;
    if (this.phase === "ROUND_PLAYING") {
      this.roundEndsAt = now + remaining;
      this.roundTimer = setTimeout(() => this.endRound(), remaining);
      // Shift bee schedule + active bee end by however long we were paused.
      for (const ev of this.beeSchedule) {
        ev.arriveAt += pauseDuration;
        ev.leaveAt += pauseDuration;
      }
      if (this.beeUntilMs) this.beeUntilMs += pauseDuration;
      this.scheduleNextBeeEvent();
    }
    this.broadcastState();
  }

  // ---------- helpers ----------

  // Return clientId of the first connected player in join order, or null.
  private electHost(): string | null {
    for (const cid of this.joinOrder) {
      const p = this.players.get(cid);
      if (p?.connected) return cid;
    }
    return null;
  }

  // Idempotent — guarantees hostPlayerId points at a connected player whenever
  // one exists. Called before every broadcast so the invariant always holds.
  private ensureHost() {
    const current = this.hostPlayerId
      ? this.players.get(this.hostPlayerId)
      : null;
    if (current?.connected) return;
    this.hostPlayerId = this.electHost();
  }

  private isHost(conn: Party.Connection): boolean {
    if (this.hostConns.has(conn.id)) return true;
    const cid = this.connToClient.get(conn.id);
    return !!cid && cid === this.hostPlayerId;
  }

  private snapshot(): PublicGameState {
    // Live found-word counts always shown during play (was previously gated
    // on easy mode; now it's just nice-to-have info on the host display).
    let liveCounts: Record<string, number> | null = null;
    if (this.phase === "ROUND_PLAYING") {
      liveCounts = {};
      for (const [cid, words] of this.foundByPlayer) {
        liveCounts[cid] = words.length;
      }
    }

    // Easy mode reveals the puzzle's valid-word count and every word the
    // room has collectively found, so kids/spectators can see hints.
    let easyModeStats: PublicGameState["easyModeStats"] = null;
    if (
      this.config.easyMode &&
      this.puzzle &&
      (this.phase === "ROUND_PLAYING" || this.phase === "ROUND_STARTING")
    ) {
      easyModeStats = {
        totalValid: this.puzzle.validWords.size,
        foundWords: [...this.firstFinder.keys()].sort(),
      };
    }

    return {
      phase: this.phase,
      config: this.config,
      players: [...this.players.values()],
      hostPlayerId: this.hostPlayerId,
      currentRound: this.currentRound,
      totalScores: Object.fromEntries(this.totalScores),
      puzzle: this.puzzle
        ? { letters: this.puzzle.letters, bonusLetter: this.puzzle.bonusLetter }
        : null,
      roundStartsAt: this.roundStartsAt,
      roundEndsAt: this.roundEndsAt,
      roundSummary: this.roundSummary,
      liveCounts,
      paused: this.paused,
      pauseRemainingMs: this.pauseRemainingMs,
      beeLetter: this.beeLetter,
      beeUntilMs: this.beeUntilMs,
      gameStats: this.gameStats,
      easyModeStats,
      lastPangramAt: this.lastPangramAt,
    };
  }

  private privateFor(clientId: string): PrivatePlayerState {
    const words = this.foundByPlayer.get(clientId) ?? [];
    return {
      foundWords: words,
      scoreThisRound: words.reduce((s, w) => s + w.points, 0),
    };
  }

  private broadcastState() {
    this.ensureHost();
    const msg: ServerMessage = { type: "state", state: this.snapshot() };
    this.room.broadcast(JSON.stringify(msg));
  }

  private broadcastAllPrivate() {
    for (const [connId, clientId] of this.connToClient) {
      const conn = this.room.getConnection(connId);
      if (!conn) continue;
      const msg: ServerMessage = { type: "private", private: this.privateFor(clientId) };
      conn.send(JSON.stringify(msg));
    }
  }

  private sendPrivate(conn: Party.Connection) {
    const clientId = this.connToClient.get(conn.id);
    if (!clientId) return;
    const msg: ServerMessage = { type: "private", private: this.privateFor(clientId) };
    conn.send(JSON.stringify(msg));
  }

  private send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }
}

function sanitizeName(raw: string): string {
  return raw.trim().slice(0, 24);
}

// Free Dictionary API (no auth, no quota of consequence). Returns null if no
// entry exists or the network fails — we'd rather show no definition than
// block the round-end UI.
async function fetchDefinition(word: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      meanings?: Array<{
        partOfSpeech?: string;
        definitions?: Array<{ definition: string }>;
      }>;
    }>;
    const meaning = data[0]?.meanings?.[0];
    const def = meaning?.definitions?.[0]?.definition;
    if (!def) return null;
    return meaning?.partOfSpeech ? `(${meaning.partOfSpeech}) ${def}` : def;
  } catch {
    return null;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

WordHiveServer satisfies Party.Worker;
