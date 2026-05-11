import type * as Party from "partykit/server";
import type {
  ActiveBee,
  GameStats,
  Phase,
  Player,
  RoundConfig,
} from "../src/shared/types";
import { DEFAULT_CONFIG } from "../src/shared/types";
import type {
  MathClientMessage,
  MathPrivatePlayerState,
  MathPublicGameState,
  MathRoundSummary,
  MathServerMessage,
  ScoredEquation,
} from "../src/shared/math-types";
import { generateMathPuzzle, type MathPuzzle } from "./mathhive-puzzle";
import { validateEquation, scoreEquation } from "./mathhive-scoring";

const COUNTDOWN_MS = 3000;
const PAUSE_GRACE_MS = 3000;
const BEE_DEPARTED_GRACE_MS = 5000;
// Math mode: continuous bee coverage. First arrival 2s into the round so
// players see the bare puzzle for a moment, then a fresh bee every 15s
// with each one lasting exactly 15s — so there's always one on the board.
const BEE_FIRST_OFFSET_MS = 2_000;
const BEE_DURATION_MS = 15_000;
const BEE_INTERVAL_MS = 15_000;

export default class MathHiveServer implements Party.Server {
  // ───────── identity / connection state ─────────
  private players = new Map<string, Player>();
  private joinOrder: string[] = [];
  private connToClient = new Map<string, string>();
  private hostConns = new Set<string>();

  // ───────── game state ─────────
  private phase: Phase = "LOBBY";
  private config: RoundConfig = { ...DEFAULT_CONFIG };
  private currentRound = 0;
  private hostPlayerId: string | null = null;
  private totalScores = new Map<string, number>();
  private puzzle: MathPuzzle | null = null;
  private roundStartsAt: number | null = null;
  private roundEndsAt: number | null = null;
  private foundByPlayer = new Map<string, ScoredEquation[]>();
  private firstFinder = new Map<string, string>();
  private roundSummary: MathRoundSummary | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;

  private paused = false;
  private pauseRemainingMs: number | null = null;
  private pauseGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedAt: number | null = null;

  private beeSchedule: Array<{ arriveAt: number; queen?: boolean }> = [];
  private bees: ActiveBee[] = [];
  private recentBees: Array<{ letter: string; expiresAt: number }> = [];

  private gameStats: GameStats = { longest: null, highest: null };
  private allEquationsByPlayer = new Map<string, ScoredEquation[]>();

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
      if (this.hostPlayerId === clientId) this.hostPlayerId = this.electHost();
      this.maybeSchedulePause();
    }
    this.broadcastState();
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: MathClientMessage;
    try {
      msg = JSON.parse(raw) as MathClientMessage;
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
      case "submitEquation":
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
      case "switchGames":
        if (this.isHost(sender)) this.handleSwitchGames();
        return;
    }
  }

  // ───────── handlers ─────────
  private handleJoin(
    sender: Party.Connection,
    msg: { name: string; avatar: string; clientId: string },
  ) {
    const name = sanitizeName(msg.name);
    if (!name || !msg.clientId) return;
    const existing = this.players.get(msg.clientId);
    if (existing) {
      existing.name = name;
      if (msg.avatar) existing.avatar = msg.avatar;
      existing.connected = true;
    } else {
      this.players.set(msg.clientId, {
        id: msg.clientId,
        name,
        avatar: msg.avatar || "fox",
        scoreMultiplier: 1,
        connected: true,
      });
      this.joinOrder.push(msg.clientId);
      this.totalScores.set(msg.clientId, this.totalScores.get(msg.clientId) ?? 0);
    }
    this.connToClient.set(sender.id, msg.clientId);
    if (!this.hostPlayerId || !this.players.get(this.hostPlayerId)?.connected) {
      this.hostPlayerId = this.electHost();
    }
    this.maybeResume();
    this.broadcastState();
    this.sendPrivate(sender);
  }

  private handleRename(sender: Party.Connection, msg: { name: string }) {
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const p = this.players.get(cid);
    if (!p) return;
    const name = sanitizeName(msg.name);
    if (!name) return;
    p.name = name;
    this.broadcastState();
  }

  private handleSetAvatar(sender: Party.Connection, msg: { avatar: string }) {
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const p = this.players.get(cid);
    if (!p || !msg.avatar) return;
    p.avatar = msg.avatar;
    this.broadcastState();
  }

  private handleSetHandicap(msg: { playerId: string; multiplier: number }) {
    const p = this.players.get(msg.playerId);
    if (!p) return;
    p.scoreMultiplier = Math.max(1, Math.min(3, msg.multiplier || 1));
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
    this.allEquationsByPlayer.clear();
    this.beginCountdown();
  }

  private beginCountdown() {
    this.currentRound += 1;
    this.puzzle = generateMathPuzzle();
    this.foundByPlayer.clear();
    this.firstFinder.clear();
    this.roundSummary = null;
    this.roundEndsAt = null;
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
    this.roundEndsAt = Date.now() + durMs;
    this.phase = "ROUND_PLAYING";
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => this.endRound(), durMs);
    this.buildBeeSchedule(Date.now(), durMs);
    this.scheduleNextBeeEvent();
    this.broadcastState();
  }

  private endRound() {
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle) return;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    this.clearBee();
    const perPlayer = [...this.players.values()].map((p) => {
      const equations = this.foundByPlayer.get(p.id) ?? [];
      const scoreThisRound = equations.reduce((s, e) => s + e.points, 0);
      return { playerId: p.id, equations, scoreThisRound };
    });
    for (const r of perPlayer) {
      this.totalScores.set(
        r.playerId,
        (this.totalScores.get(r.playerId) ?? 0) + r.scoreThisRound,
      );
      const all = this.allEquationsByPlayer.get(r.playerId) ?? [];
      this.allEquationsByPlayer.set(r.playerId, [...all, ...r.equations]);
    }
    this.roundSummary = { digits: this.puzzle.outerDigits, perPlayer };
    this.roundEndsAt = null;
    this.phase = "ROUND_RESULTS";
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
    this.allEquationsByPlayer.clear();
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private handleSubmit(sender: Party.Connection, msg: { equation: string }) {
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle || this.paused) {
      this.send(sender, {
        type: "submitResult",
        equation: msg.equation,
        ok: false,
        reason: "not_in_round",
      });
      return;
    }
    const now = Date.now();
    this.recentBees = this.recentBees.filter((r) => r.expiresAt > now);
    const extraDigits = new Set<string>();
    for (const b of this.bees) extraDigits.add(b.letter);
    for (const r of this.recentBees) extraDigits.add(r.letter);

    const result = validateEquation(msg.equation, this.puzzle, extraDigits);
    if (!result.ok) {
      this.send(sender, {
        type: "submitResult",
        equation: msg.equation,
        ok: false,
        reason: result.reason,
      });
      return;
    }

    const found = this.foundByPlayer.get(cid) ?? [];
    if (found.some((e) => e.equation === result.normalized)) {
      this.send(sender, {
        type: "submitResult",
        equation: result.normalized,
        ok: false,
        reason: "already_found",
      });
      return;
    }

    const isFirst = !this.firstFinder.has(result.normalized);
    if (isFirst) this.firstFinder.set(result.normalized, cid);

    const player = this.players.get(cid);
    const playerMult = player?.scoreMultiplier ?? 1;
    // Classic: bee letter usage gives a 2x multiplier. Swarm: bee multipliers
    // (not implemented yet for math — punt to "skip swarm in math v1").
    // The word benefits from the bee if it uses any digit that's currently
    // (or recently was) a bee letter. Allows duplicate bees to still boost.
    const beeLetters = new Set<string>();
    for (const b of this.bees) beeLetters.add(b.letter);
    for (const r of this.recentBees) beeLetters.add(r.letter);
    const usedBee = result.digitChars.some((d) => beeLetters.has(d));
    let m = 1;
    if (usedBee) m *= 2;
    m *= playerMult;
    const base = scoreEquation({
      validation: result,
      puzzle: this.puzzle,
      firstFinder: isFirst,
    });
    const scored: ScoredEquation = {
      ...base,
      points: Math.round(base.points * m),
      beeBonus: usedBee,
    };
    found.push(scored);
    this.foundByPlayer.set(cid, found);

    if (
      !this.gameStats.longest ||
      result.normalized.length > this.gameStats.longest.word.length
    ) {
      this.gameStats.longest = { word: result.normalized, playerId: cid };
    }
    if (!this.gameStats.highest || scored.points > this.gameStats.highest.points) {
      this.gameStats.highest = {
        word: result.normalized,
        points: scored.points,
        playerId: cid,
      };
    }

    this.send(sender, {
      type: "submitResult",
      equation: result.normalized,
      ok: true,
      points: scored.points,
      pangram: scored.pangram,
      firstFinder: scored.firstFinder,
    });
    this.sendPrivate(sender);
    if (this.config.easyMode) this.broadcastState();
  }

  // ───────── pause/resume ─────────
  private maybeSchedulePause() {
    if (this.phase !== "ROUND_PLAYING") return;
    if (this.paused) return;
    if (this.pauseGraceTimer) return;
    this.pauseGraceTimer = setTimeout(() => {
      this.pauseGraceTimer = null;
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
    if (this.paused) this.resume();
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
      for (const ev of this.beeSchedule) ev.arriveAt += pauseDuration;
      for (const b of this.bees) b.leaveAt += pauseDuration;
      for (const r of this.recentBees) r.expiresAt += pauseDuration;
      this.scheduleNextBeeEvent();
    }
    this.broadcastState();
  }

  private handleTogglePause() {
    if (this.phase !== "ROUND_PLAYING") return;
    if (this.paused) this.resume();
    else this.doPause();
  }

  private handleSwitchGames() {
    this.handleResetGame();
    this.room.broadcast(JSON.stringify({ type: "switchGames" } satisfies MathServerMessage));
  }

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
    this.allEquationsByPlayer.clear();
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  // ───────── bees (classic only for math v1) ─────────
  private buildBeeSchedule(roundStart: number, durMs: number) {
    this.beeSchedule = [];
    if (!this.puzzle) return;
    // Classic cadence: first at +15s, lasts 15s, every 30s.
    for (let t = BEE_FIRST_OFFSET_MS; t + BEE_DURATION_MS <= durMs; t += BEE_INTERVAL_MS) {
      this.beeSchedule.push({ arriveAt: roundStart + t });
    }
  }

  private scheduleNextBeeEvent() {
    const now = Date.now();
    let nextAt: number | null = null;
    if (this.beeSchedule[0]) nextAt = this.beeSchedule[0].arriveAt;
    for (const b of this.bees) {
      if (nextAt === null || b.leaveAt < nextAt) nextAt = b.leaveAt;
    }
    if (nextAt === null) {
      this.room.storage.deleteAlarm().catch(() => {});
      return;
    }
    const target = Math.max(now + 10, nextAt);
    this.room.storage.setAlarm(target).catch(() => {});
  }

  async onAlarm() {
    try {
      this.processBeeEvents();
    } catch (e) {
      console.error("[math/bees] onAlarm threw:", e);
      this.room.storage.setAlarm(Date.now() + 1000).catch(() => {});
    }
  }

  private processBeeEvents() {
    if (this.phase !== "ROUND_PLAYING" || this.paused) return;
    const now = Date.now();
    let changed = false;
    const remaining: ActiveBee[] = [];
    for (const b of this.bees) {
      if (b.leaveAt <= now) {
        this.recentBees.push({ letter: b.letter, expiresAt: now + BEE_DEPARTED_GRACE_MS });
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
      }
    }
    if (changed) this.broadcastState();
    this.scheduleNextBeeEvent();
  }

  private spawnBee(ev: { arriveAt: number; queen?: boolean }): ActiveBee | null {
    if (!this.puzzle) return null;
    const digit = this.pickBeeDigit();
    return {
      letter: digit, // ActiveBee's "letter" field carries the bee digit
      slot: -1,
      multiplier: 1,
      leaveAt: ev.arriveAt + BEE_DURATION_MS,
    };
  }

  private pickBeeDigit(): string {
    // Any digit 0-9 — overlap with puzzle digits is allowed. (If a bee
    // brings a duplicate, the visible board doesn't gain a new digit, but
    // words using that digit still get the bee 2x multiplier.)
    const digits = "0123456789".split("");
    // Avoid back-to-back identical bees (mildly confusing).
    const lastBee = this.bees[this.bees.length - 1]?.letter;
    const pool = lastBee ? digits.filter((d) => d !== lastBee) : digits;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private clearBee() {
    this.room.storage.deleteAlarm().catch(() => {});
    this.bees = [];
    this.beeSchedule = [];
    this.recentBees = [];
  }

  // ───────── helpers ─────────
  private electHost(): string | null {
    for (const cid of this.joinOrder) {
      const p = this.players.get(cid);
      if (p?.connected) return cid;
    }
    return null;
  }

  private ensureHost() {
    const cur = this.hostPlayerId ? this.players.get(this.hostPlayerId) : null;
    if (cur?.connected) return;
    this.hostPlayerId = this.electHost();
  }

  private isHost(conn: Party.Connection): boolean {
    if (this.hostConns.has(conn.id)) return true;
    const cid = this.connToClient.get(conn.id);
    return !!cid && cid === this.hostPlayerId;
  }

  private snapshot(): MathPublicGameState {
    let liveCounts: Record<string, number> | null = null;
    if (this.phase === "ROUND_PLAYING") {
      liveCounts = {};
      for (const [cid, eqs] of this.foundByPlayer) liveCounts[cid] = eqs.length;
    }
    let easyModeStats: MathPublicGameState["easyModeStats"] = null;
    if (
      this.config.easyMode &&
      this.puzzle &&
      (this.phase === "ROUND_PLAYING" || this.phase === "ROUND_STARTING")
    ) {
      easyModeStats = { foundEquations: [...this.firstFinder.keys()].sort() };
    }
    let playerTopEquations: Record<string, ScoredEquation[]> | null = null;
    if (this.phase === "FINAL_RESULTS") {
      playerTopEquations = {};
      for (const [cid, eqs] of this.allEquationsByPlayer) {
        playerTopEquations[cid] = [...eqs]
          .sort((a, b) => b.points - a.points || b.equation.length - a.equation.length)
          .slice(0, 10);
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
        ? {
            centerOperator: this.puzzle.centerOperator,
            outerDigits: this.puzzle.outerDigits,
          }
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
      playerTopEquations,
    };
  }

  private privateFor(cid: string): MathPrivatePlayerState {
    const eqs = this.foundByPlayer.get(cid) ?? [];
    return {
      foundEquations: eqs,
      scoreThisRound: eqs.reduce((s, e) => s + e.points, 0),
    };
  }

  private broadcastState() {
    this.ensureHost();
    const msg: MathServerMessage = { type: "state", state: this.snapshot() };
    this.room.broadcast(JSON.stringify(msg));
  }

  private broadcastAllPrivate() {
    for (const [connId, cid] of this.connToClient) {
      const conn = this.room.getConnection(connId);
      if (!conn) continue;
      const msg: MathServerMessage = { type: "private", private: this.privateFor(cid) };
      conn.send(JSON.stringify(msg));
    }
  }

  private sendPrivate(conn: Party.Connection) {
    const cid = this.connToClient.get(conn.id);
    if (!cid) return;
    const msg: MathServerMessage = { type: "private", private: this.privateFor(cid) };
    conn.send(JSON.stringify(msg));
  }

  private send(conn: Party.Connection, msg: MathServerMessage) {
    conn.send(JSON.stringify(msg));
  }
}

function sanitizeName(raw: string): string {
  return raw.trim().slice(0, 24);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

MathHiveServer satisfies Party.Worker;
