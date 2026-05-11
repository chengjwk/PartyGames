import type * as Party from "partykit/server";
import type {
  ActiveBee,
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
import { DEFAULT_CONFIG, SWARM_MIN_DURATION_SECONDS } from "../src/shared/types";
import { generatePuzzle, type Puzzle } from "./puzzle";
import { validateWord, scoreWord } from "./scoring";
import pangramDefs from "./data/pangram-defs.json";

const COUNTDOWN_MS = 3000;
const VOWELS_LOWER = new Set(["a", "e", "i", "o", "u"]);
const PAUSE_GRACE_MS = 3000;
const BEE_DEPARTED_GRACE_MS = 5000;
// Swarm-mode cadence — tuned for ~9 worker bees + 1 queen on a 90s round,
// with 2-3 simultaneous bees on the board by the second half.
const SWARM_FIRST_OFFSET_MS = 8_000;
const SWARM_BEE_DURATION_MS = 12_000;
const SWARM_QUEEN_DURATION_MS = 8_000;
const SWARM_INTERVAL_START_MS = 12_000;
const SWARM_INTERVAL_END_MS = 3_500;
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
  // Pre-computed arrival schedule + currently-on-board bees.
  // The next bee event (arrival OR departure) is scheduled via the DO's
  // storage alarm so it survives hibernation when the room goes idle.
  private beeSchedule: Array<{ arriveAt: number; queen?: boolean }> = [];
  private bees: ActiveBee[] = [];
  // Recently-departed bee letters stay valid for a short grace so a queued
  // submit doesn't fail just because the bee left a beat ago.
  private recentBees: Array<{ letter: string; expiresAt: number }> = [];
  private gameStats: GameStats = { longest: null, highest: null };
  private lastPangramAt: number | null = null;
  // Every word found across all rounds, per player. Used to compute each
  // player's top 10 highest-scoring words at FINAL_RESULTS.
  private allWordsByPlayer = new Map<string, ScoredWord[]>();
  // Rolling buffer of recent pangram seeds so the same one doesn't repeat
  // within a short window in the same room. Resets when the room idles out.
  private recentSeeds: string[] = [];
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
    if (msg.config.mode === "classic" || msg.config.mode === "swarm") {
      next.mode = msg.config.mode;
    }
    if (typeof msg.config.totalRounds === "number") {
      next.totalRounds = clamp(Math.round(msg.config.totalRounds), 1, 10);
    }
    if (typeof msg.config.roundDurationSeconds === "number") {
      const minDur = next.mode === "swarm" ? SWARM_MIN_DURATION_SECONDS : 15;
      next.roundDurationSeconds = clamp(
        Math.round(msg.config.roundDurationSeconds),
        minDur,
        600,
      );
    }
    if (typeof msg.config.easyMode === "boolean") {
      next.easyMode = msg.config.easyMode;
    }
    // If we just switched into swarm and the duration is below the min, bump it.
    if (next.mode === "swarm" && next.roundDurationSeconds < SWARM_MIN_DURATION_SECONDS) {
      next.roundDurationSeconds = SWARM_MIN_DURATION_SECONDS;
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
    this.allWordsByPlayer.clear();
    this.beginCountdown();
  }

  // Three-second pause before the round actually begins, so everyone has time
  // to look up at the puzzle.
  private beginCountdown() {
    this.currentRound += 1;
    this.puzzle = generatePuzzle({ exclude: new Set(this.recentSeeds) });
    this.recentSeeds.unshift(this.puzzle.seedWord);
    const MAX_RECENT = 50;
    if (this.recentSeeds.length > MAX_RECENT) this.recentSeeds.length = MAX_RECENT;
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
    if (this.config.mode === "swarm") {
      this.buildSwarmSchedule(roundStart, durMs);
    } else {
      this.buildClassicSchedule(roundStart, durMs);
    }
    console.log(
      `[bees] schedule built: mode=${this.config.mode}, durMs=${durMs}, events=${this.beeSchedule.length}`,
    );
  }

  private buildClassicSchedule(roundStart: number, durMs: number) {
    for (let t = BEE_FIRST_OFFSET_MS; t + BEE_DURATION_MS <= durMs; t += BEE_INTERVAL_MS) {
      this.beeSchedule.push({ arriveAt: roundStart + t });
    }
  }

  // Inter-arrival shrinks linearly from SWARM_INTERVAL_START_MS down to
  // SWARM_INTERVAL_END_MS as the round elapses, so the room feels busier
  // toward the end. Plus one queen bee in the middle third of the round.
  private buildSwarmSchedule(roundStart: number, durMs: number) {
    let t = SWARM_FIRST_OFFSET_MS;
    while (t + SWARM_BEE_DURATION_MS <= durMs) {
      this.beeSchedule.push({ arriveAt: roundStart + t });
      const fraction = Math.min(1, t / durMs);
      const interval =
        SWARM_INTERVAL_START_MS -
        (SWARM_INTERVAL_START_MS - SWARM_INTERVAL_END_MS) * fraction;
      t += interval;
    }
    const queenStart = durMs * 0.33;
    const queenEnd = Math.min(durMs - SWARM_QUEEN_DURATION_MS - 2000, durMs * 0.6);
    if (queenEnd > queenStart) {
      const queenT = queenStart + Math.random() * (queenEnd - queenStart);
      this.beeSchedule.push({ arriveAt: roundStart + queenT, queen: true });
      this.beeSchedule.sort((a, b) => a.arriveAt - b.arriveAt);
    }
  }

  // One timer for everything; fires at whichever is sooner: next arrival,
  // or earliest active-bee departure.
  // Schedules the next bee event via the DO storage alarm. The alarm survives
  // hibernation, which plain setTimeout did not — that was killing the bee
  // chain whenever the room went briefly idle between events.
  private scheduleNextBeeEvent() {
    const now = Date.now();
    let nextEventAt: number | null = null;
    if (this.beeSchedule[0]) nextEventAt = this.beeSchedule[0].arriveAt;
    for (const b of this.bees) {
      if (nextEventAt === null || b.leaveAt < nextEventAt) nextEventAt = b.leaveAt;
    }
    if (nextEventAt === null) {
      console.log("[bees] no more events to schedule");
      this.room.storage.deleteAlarm().catch(() => {});
      return;
    }
    // Alarms only fire at-or-after the requested time; make sure we don't
    // accidentally pass a past timestamp (setAlarm rejects those silently).
    const target = Math.max(now + 10, nextEventAt);
    console.log(
      `[bees] next event in ${target - now}ms (schedule=${this.beeSchedule.length}, active=${this.bees.length})`,
    );
    this.room.storage.setAlarm(target).catch((e) => {
      console.error("[bees] setAlarm failed:", e);
    });
  }

  // Called by the runtime when the storage alarm fires.
  async onAlarm() {
    try {
      this.processBeeEvents();
    } catch (e) {
      console.error("[bees] onAlarm processBeeEvents threw:", e);
      // Retry shortly so the chain doesn't die.
      this.room.storage.setAlarm(Date.now() + 1000).catch(() => {});
    }
  }

  private processBeeEvents() {
    if (this.phase !== "ROUND_PLAYING") {
      console.log(`[bees] tick fired but phase=${this.phase}, stopping`);
      return;
    }
    if (this.paused) {
      console.log("[bees] tick fired but paused; will rearm on resume");
      return;
    }
    const now = Date.now();
    let changed = false;

    const remaining: ActiveBee[] = [];
    for (const b of this.bees) {
      if (b.leaveAt <= now) {
        this.recentBees.push({ letter: b.letter, expiresAt: now + BEE_DEPARTED_GRACE_MS });
        console.log(`[bees] departure: ${b.letter} slot=${b.slot}`);
        changed = true;
      } else {
        remaining.push(b);
      }
    }
    this.bees = remaining;

    while (this.beeSchedule.length > 0 && this.beeSchedule[0].arriveAt <= now) {
      const ev = this.beeSchedule.shift()!;
      const bee = this.spawnBee(ev);
      if (bee) {
        this.bees.push(bee);
        changed = true;
        console.log(`[bees] arrival: ${bee.letter} slot=${bee.slot} x${bee.multiplier}${bee.queen ? " QUEEN" : ""}`);
      } else {
        console.log(`[bees] arrival skipped (no free slot or letter) for event at ${ev.arriveAt}`);
      }
    }

    if (changed) this.broadcastState();
    this.scheduleNextBeeEvent();
  }

  private spawnBee(ev: { arriveAt: number; queen?: boolean }): ActiveBee | null {
    if (!this.puzzle) return null;
    const isSwarm = this.config.mode === "swarm";

    if (!isSwarm) {
      // Classic: single floating 8th letter — any letter is fine.
      const letter = this.pickBeeLetter();
      if (!letter) return null;
      return {
        letter,
        slot: -1,
        multiplier: 1,
        leaveAt: ev.arriveAt + BEE_DURATION_MS,
      };
    }

    // Swarm: figure out which slot we're landing on first.
    let slot: number;
    let multiplier: number;
    if (ev.queen) {
      slot = 0;
      multiplier = 5;
    } else {
      slot = this.pickFreeOuterSlot();
      if (slot === -1) return null;
      multiplier = this.pickMultiplier();
    }

    // Vowels currently visible on the board AFTER this bee covers `slot`,
    // BUT not counting the new bee's own letter. If zero, force the new
    // bee letter to be a vowel so the board always has at least one.
    const visibleVowelsWithoutNew = this.countVisibleVowels(slot);
    const letter =
      visibleVowelsWithoutNew > 0
        ? this.pickBeeLetter()
        : this.pickVowelBeeLetter() ?? this.pickBeeLetter();
    if (!letter) return null;

    return {
      letter,
      slot,
      multiplier,
      leaveAt:
        ev.arriveAt + (ev.queen ? SWARM_QUEEN_DURATION_MS : SWARM_BEE_DURATION_MS),
      queen: ev.queen,
    };
  }

  // Count vowels visible on the board if `excludeSlot` (the new bee's slot)
  // is covered. Excludes the new bee's own letter from the count — caller
  // uses this to decide whether the new bee letter needs to be a vowel.
  private countVisibleVowels(excludeSlot: number): number {
    if (!this.puzzle) return 0;
    let count = 0;
    // Center (slot 0)
    if (excludeSlot !== 0) {
      const queen = this.bees.find((b) => b.queen);
      const centerLetter = queen?.letter ?? this.puzzle.center;
      if (VOWELS_LOWER.has(centerLetter)) count++;
    }
    // Outer slots 1..6
    const outerLetters = this.puzzle.letters.slice(1);
    for (let i = 1; i <= 6; i++) {
      if (i === excludeSlot) continue;
      const cover = this.bees.find((b) => b.slot === i);
      const effLetter = cover ? cover.letter : outerLetters[i - 1];
      if (VOWELS_LOWER.has(effLetter)) count++;
    }
    return count;
  }

  private pickVowelBeeLetter(): string | null {
    if (!this.puzzle) return null;
    const taken = new Set<string>([
      ...this.puzzle.letterSet,
      ...this.bees.map((b) => b.letter),
    ]);
    const freeVowels = [...VOWELS_LOWER].filter((v) => !taken.has(v));
    if (freeVowels.length === 0) return null;
    return freeVowels[Math.floor(Math.random() * freeVowels.length)];
  }

  private pickFreeOuterSlot(): number {
    const busy = new Set(
      this.bees.filter((b) => b.slot >= 1 && b.slot <= 6).map((b) => b.slot),
    );
    const free = [1, 2, 3, 4, 5, 6].filter((s) => !busy.has(s));
    if (free.length === 0) return -1;
    return free[Math.floor(Math.random() * free.length)];
  }

  private pickMultiplier(): number {
    const r = Math.random();
    if (r < 0.5) return 1.5;
    if (r < 0.85) return 2;
    return 3;
  }

  private pickBeeLetter(): string | null {
    if (!this.puzzle) return null;
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const taken = new Set<string>([...this.puzzle.letterSet, ...this.bees.map((b) => b.letter)]);
    const free = alphabet.filter((l) => !taken.has(l));
    if (free.length === 0) return null;
    return free[Math.floor(Math.random() * free.length)];
  }

  private clearBee() {
    this.room.storage.deleteAlarm().catch(() => {});
    this.bees = [];
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
      // Accumulate this round's words into the per-game history.
      const all = this.allWordsByPlayer.get(r.playerId) ?? [];
      this.allWordsByPlayer.set(r.playerId, [...all, ...r.words]);
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
    this.allWordsByPlayer.clear();
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
    for (const b of this.bees) extraLetters.add(b.letter);
    for (const r of this.recentBees) extraLetters.add(r.letter);
    // In swarm mode, an active queen replaces the center letter requirement.
    const queen = this.bees.find((b) => b.queen);
    const centerOverride =
      this.config.mode === "swarm" && queen ? queen.letter : undefined;
    const result = validateWord(msg.word, this.puzzle, extraLetters, centerOverride);
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
    const isSwarm = this.config.mode === "swarm";
    // In classic mode the static bonusLetter scores 2x. In swarm mode there's
    // no static bonus — bees carry multipliers instead.
    const usedBonus = !isSwarm && result.word.includes(this.puzzle.bonusLetter);
    // The set of bee letters actually used in this word.
    const beeLettersUsed = this.bees.filter((b) => result.word.includes(b.letter));
    const usedBee = beeLettersUsed.length > 0;
    let m = 1;
    if (usedBonus) m *= 2;
    if (isSwarm && beeLettersUsed.length > 0) {
      // Max multiplier among bee letters used (queen 5x dominates).
      const maxBee = Math.max(...beeLettersUsed.map((b) => b.multiplier));
      m *= maxBee;
    }
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
    this.room.storage.deleteAlarm().catch(() => {});
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
    this.allWordsByPlayer.clear();
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
      // Shift all bee timings forward by the pause duration.
      for (const ev of this.beeSchedule) ev.arriveAt += pauseDuration;
      for (const b of this.bees) b.leaveAt += pauseDuration;
      for (const r of this.recentBees) r.expiresAt += pauseDuration;
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

    let playerTopWords: Record<string, ScoredWord[]> | null = null;
    if (this.phase === "FINAL_RESULTS") {
      playerTopWords = {};
      for (const [cid, words] of this.allWordsByPlayer) {
        const top = [...words]
          .sort((a, b) => b.points - a.points || b.word.length - a.word.length)
          .slice(0, 10);
        playerTopWords[cid] = top;
      }
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
      bees: this.bees,
      gameStats: this.gameStats,
      easyModeStats,
      lastPangramAt: this.lastPangramAt,
      playerTopWords,
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
