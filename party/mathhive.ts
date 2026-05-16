// MathHive server (v2).
//
// Per-player target streams over a shared digit pool. The server generates
// one puzzle per round (6 unique digits + an operator set picked by
// difficulty), enumerates all reachable values once, then samples a
// candidate list to deal out as targets. Each player burns through their
// own slice of that candidate list — when they solve or skip, the server
// hands them another. Score = sum of time-decayed points − skip penalties.

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
  MathLiveStat,
  MathPlayerRoundResult,
  MathPrivatePlayerState,
  MathPublicGameState,
  MathRoundSummary,
  MathServerMessage,
  MathSkippedRecord,
  MathSolveStep,
  MathSolvedRecord,
  MathTargetPublic,
} from "../src/shared/math-types";
import {
  SKIP_PENALTY,
  TARGET_BASE_POINTS,
  TARGET_FLOOR_POINTS,
  TARGET_TIME_BUDGET_MS,
  buildTargetCandidates,
  generateMathPuzzle,
  type MathPuzzle,
} from "./mathhive-puzzle";
import { scoreSolve, verifySolve } from "./mathhive-scoring";

const COUNTDOWN_MS = 3000;
const PAUSE_GRACE_MS = 3000;

interface PerPlayerRoundState {
  currentTarget: MathTargetPublic | null;
  // Index into puzzle.targetCandidates we'll draw from next. Wraps around
  // if a fast solver burns through the deck.
  cursor: number;
  // Last target value handed out — used to avoid back-to-back duplicates
  // for a single player.
  lastValue: number | null;
  solved: MathSolvedRecord[];
  skipped: MathSkippedRecord[];
  scoreThisRound: number;
}

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
  private targetCandidates: number[] = [];
  private perPlayer = new Map<string, PerPlayerRoundState>();
  // Records across the whole game per player (for FINAL_RESULTS top-solves).
  private allSolvesByPlayer = new Map<string, MathSolvedRecord[]>();

  private roundStartsAt: number | null = null;
  private roundEndsAt: number | null = null;
  private roundSummary: MathRoundSummary | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;

  private paused = false;
  private pauseRemainingMs: number | null = null;
  private pauseGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedAt: number | null = null;

  private bees: ActiveBee[] = [];

  private gameStats: GameStats = { longest: null, highest: null };
  private nextTargetSerial = 1;

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
      case "solveTarget":
        this.handleSolve(sender, msg);
        return;
      case "skipTarget":
        this.handleSkip(sender, msg);
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
    // If joining mid-round and we don't have a target for this player yet,
    // deal one. (Auto-pause usually fires before this matters, but be
    // robust about it.)
    if (this.phase === "ROUND_PLAYING") {
      const st = this.perPlayer.get(msg.clientId);
      if (!st) {
        this.perPlayer.set(msg.clientId, this.makeInitialPlayerState());
      }
      const cur = this.perPlayer.get(msg.clientId)!;
      if (!cur.currentTarget) this.dealNextTarget(msg.clientId);
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
    if (
      msg.config.mathDifficulty === "easy" ||
      msg.config.mathDifficulty === "medium" ||
      msg.config.mathDifficulty === "hard"
    ) {
      next.mathDifficulty = msg.config.mathDifficulty;
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
    this.allSolvesByPlayer.clear();
    this.beginCountdown();
  }

  private beginCountdown() {
    this.currentRound += 1;
    this.puzzle = generateMathPuzzle(this.config.mathDifficulty);
    this.targetCandidates = buildTargetCandidates(this.puzzle);
    this.perPlayer.clear();
    for (const cid of this.players.keys()) {
      this.perPlayer.set(cid, this.makeInitialPlayerState());
    }
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
    // Hand each player their opening target.
    for (const cid of this.players.keys()) this.dealNextTarget(cid);
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private endRound() {
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle) return;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    const perPlayer: MathPlayerRoundResult[] = [];
    for (const p of this.players.values()) {
      const st = this.perPlayer.get(p.id);
      if (!st) {
        perPlayer.push({
          playerId: p.id,
          scoreThisRound: 0,
          solved: [],
          skipped: [],
        });
        continue;
      }
      perPlayer.push({
        playerId: p.id,
        scoreThisRound: st.scoreThisRound,
        solved: st.solved,
        skipped: st.skipped,
      });
      this.totalScores.set(
        p.id,
        (this.totalScores.get(p.id) ?? 0) + st.scoreThisRound,
      );
      const acc = this.allSolvesByPlayer.get(p.id) ?? [];
      this.allSolvesByPlayer.set(p.id, [...acc, ...st.solved]);
      // Game stats: highest single solve.
      for (const r of st.solved) {
        if (!this.gameStats.highest || r.points > this.gameStats.highest.points) {
          this.gameStats.highest = {
            word: String(r.targetValue),
            points: r.points,
            playerId: p.id,
          };
        }
      }
    }
    this.roundSummary = {
      digits: this.puzzle.digits,
      operators: this.puzzle.operators,
      perPlayer,
    };
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
    this.targetCandidates = [];
    this.perPlayer.clear();
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
    this.gameStats = { longest: null, highest: null };
    this.allSolvesByPlayer.clear();
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private handleSolve(
    sender: Party.Connection,
    msg: { targetId: string; steps: MathSolveStep[] },
  ) {
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle || this.paused) {
      this.send(sender, {
        type: "solveResult",
        targetId: msg.targetId,
        ok: false,
        reason: "not_in_round",
      });
      return;
    }
    const st = this.perPlayer.get(cid);
    if (!st || !st.currentTarget || st.currentTarget.id !== msg.targetId) {
      this.send(sender, {
        type: "solveResult",
        targetId: msg.targetId,
        ok: false,
        reason: "wrong_target",
      });
      return;
    }
    const target = st.currentTarget;
    const verdict = verifySolve({
      poolDigits: this.puzzle.digits,
      allowedOperators: this.puzzle.operators,
      steps: msg.steps,
      target: target.value,
    });
    if (!verdict.ok) {
      this.send(sender, {
        type: "solveResult",
        targetId: target.id,
        ok: false,
        reason: verdict.reason,
      });
      return;
    }
    const now = Date.now();
    const solveMs = Math.max(0, now - target.startedAt);
    const player = this.players.get(cid);
    const playerMult = player?.scoreMultiplier ?? 1;
    const basePts = scoreSolve({
      basePoints: target.basePoints,
      floorPoints: target.floorPoints,
      timeBudgetMs: target.timeBudgetMs,
      solveMs,
      allSix: verdict.allSix,
    });
    const points = Math.round(basePts * playerMult);
    st.scoreThisRound += points;
    const record: MathSolvedRecord = {
      targetId: target.id,
      targetValue: target.value,
      points,
      solveMs,
      allSix: verdict.allSix,
    };
    st.solved.push(record);
    this.send(sender, {
      type: "solveResult",
      targetId: target.id,
      ok: true,
      points,
      allSix: verdict.allSix,
      solveMs,
    });
    this.dealNextTarget(cid);
    this.sendPrivate(sender);
    this.broadcastState();
  }

  private handleSkip(sender: Party.Connection, msg: { targetId: string }) {
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    if (this.phase !== "ROUND_PLAYING" || !this.puzzle || this.paused) return;
    const st = this.perPlayer.get(cid);
    if (!st || !st.currentTarget || st.currentTarget.id !== msg.targetId) {
      this.send(sender, { type: "skipResult", targetId: msg.targetId, ok: false });
      return;
    }
    const target = st.currentTarget;
    st.scoreThisRound += SKIP_PENALTY;
    st.skipped.push({ targetId: target.id, targetValue: target.value });
    this.send(sender, { type: "skipResult", targetId: target.id, ok: true });
    this.dealNextTarget(cid);
    this.sendPrivate(sender);
    this.broadcastState();
  }

  private makeInitialPlayerState(): PerPlayerRoundState {
    return {
      currentTarget: null,
      cursor: Math.floor(Math.random() * Math.max(1, this.targetCandidates.length)),
      lastValue: null,
      solved: [],
      skipped: [],
      scoreThisRound: 0,
    };
  }

  private dealNextTarget(playerId: string) {
    if (!this.puzzle) return;
    const st = this.perPlayer.get(playerId);
    if (!st) return;
    if (this.targetCandidates.length === 0) {
      // No candidates (extremely thin pool) — synthesize a fallback target.
      st.currentTarget = null;
      return;
    }
    // Pick the next value, avoiding back-to-back duplicate for this player.
    let value: number | null = null;
    for (let i = 0; i < this.targetCandidates.length; i++) {
      const candidate = this.targetCandidates[st.cursor % this.targetCandidates.length];
      st.cursor++;
      if (candidate !== st.lastValue) {
        value = candidate;
        break;
      }
    }
    if (value === null) value = this.targetCandidates[0];
    st.lastValue = value;
    const info = this.puzzle.reachable.get(value);
    const minOps = info ? Math.max(1, Math.min(5, info.minOps)) : 2;
    const basePoints =
      TARGET_BASE_POINTS[minOps] ?? TARGET_BASE_POINTS[2];
    const timeBudgetMs =
      TARGET_TIME_BUDGET_MS[minOps] ?? TARGET_TIME_BUDGET_MS[2];
    const target: MathTargetPublic = {
      id: `T${this.nextTargetSerial++}`,
      value,
      minOps,
      timeBudgetMs,
      basePoints,
      floorPoints: TARGET_FLOOR_POINTS,
      startedAt: Date.now(),
    };
    st.currentTarget = target;
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
      // Shift each player's current-target start so the points-clock
      // doesn't lurch past their effective time budget.
      for (const st of this.perPlayer.values()) {
        if (st.currentTarget) {
          st.currentTarget.startedAt += pauseDuration;
        }
      }
    }
    this.broadcastState();
    this.broadcastAllPrivate();
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
    this.phase = "LOBBY";
    this.currentRound = 0;
    this.totalScores.clear();
    this.puzzle = null;
    this.targetCandidates = [];
    this.perPlayer.clear();
    this.roundSummary = null;
    this.roundStartsAt = null;
    this.roundEndsAt = null;
    this.paused = false;
    this.pauseRemainingMs = null;
    this.pausedAt = null;
    this.gameStats = { longest: null, highest: null };
    this.allSolvesByPlayer.clear();
    this.broadcastState();
    this.broadcastAllPrivate();
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
    let liveStats: Record<string, MathLiveStat> | null = null;
    if (this.phase === "ROUND_PLAYING" || this.phase === "ROUND_RESULTS") {
      liveStats = {};
      for (const [cid, st] of this.perPlayer) {
        liveStats[cid] = {
          solved: st.solved.length,
          skipped: st.skipped.length,
          scoreThisRound: st.scoreThisRound,
        };
      }
    }
    let playerTopSolves: Record<string, MathSolvedRecord[]> | null = null;
    if (this.phase === "FINAL_RESULTS") {
      playerTopSolves = {};
      for (const [cid, all] of this.allSolvesByPlayer) {
        playerTopSolves[cid] = [...all]
          .sort((a, b) => b.points - a.points)
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
        ? { digits: this.puzzle.digits, operators: this.puzzle.operators }
        : null,
      roundStartsAt: this.roundStartsAt,
      roundEndsAt: this.roundEndsAt,
      roundSummary: this.roundSummary,
      liveStats,
      paused: this.paused,
      pauseRemainingMs: this.pauseRemainingMs,
      bees: this.bees,
      gameStats: this.gameStats,
      playerTopSolves,
    };
  }

  private privateFor(cid: string): MathPrivatePlayerState {
    const st = this.perPlayer.get(cid);
    if (!st) {
      return { currentTarget: null, scoreThisRound: 0, solved: [], skipped: [] };
    }
    return {
      currentTarget: st.currentTarget,
      scoreThisRound: st.scoreThisRound,
      solved: st.solved,
      skipped: st.skipped,
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
