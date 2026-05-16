// Wire types for MathHive (v2).
//
// New model: a shared pool of 6 digits + an operator set determined by
// difficulty. Each player gets their OWN target stream — when they solve
// (or skip) one target, the server hands them another. The honeycomb-style
// build-an-equation UX is replaced by a Digits-style tap-to-combine UX:
// pick two tiles + an operator, the result becomes a new tile; the two
// source tiles are consumed.
//
// Most framework types (Player, RoundConfig, Phase, ActiveBee, GameStats)
// are reused from ../shared/types.ts.

import type { Player, RoundConfig, ActiveBee, Phase, GameStats } from "./types";

export type MathOperator = "+" | "-" | "*" | "/";
export type MathDifficulty = "easy" | "medium" | "hard";

export interface MathPuzzlePublic {
  digits: string[]; // length 6 — the round's shared digit pool
  operators: MathOperator[]; // operator set the player can use this round
}

// A target handed to a single player. The server retains the canonical
// solution(s) and doesn't reveal them. minOps lets the client show a
// difficulty hint and lets the time-decay timer pace correctly.
export interface MathTargetPublic {
  id: string;
  value: number;
  minOps: number; // smallest number of binary ops needed in some solution
  timeBudgetMs: number; // points decay to floor at this point
  basePoints: number; // award if solved instantly
  floorPoints: number; // award after the budget elapses
  // Server-issued timestamp. Used by the client to render the points-clock.
  startedAt: number;
}

export interface MathSolvedRecord {
  targetId: string;
  targetValue: number;
  points: number;
  solveMs: number;
  allSix: boolean;
}

export interface MathSkippedRecord {
  targetId: string;
  targetValue: number;
}

export interface MathPlayerRoundResult {
  playerId: string;
  scoreThisRound: number;
  solved: MathSolvedRecord[];
  skipped: MathSkippedRecord[];
}

export interface MathRoundSummary {
  digits: string[];
  operators: MathOperator[];
  perPlayer: MathPlayerRoundResult[];
}

export interface MathLiveStat {
  solved: number;
  skipped: number;
  scoreThisRound: number;
}

export interface MathPublicGameState {
  phase: Phase;
  config: RoundConfig;
  players: Player[];
  hostPlayerId: string | null;
  currentRound: number;
  totalScores: Record<string, number>;
  puzzle: MathPuzzlePublic | null;
  roundStartsAt: number | null;
  roundEndsAt: number | null;
  roundSummary: MathRoundSummary | null;
  // Live per-player stats: solve count, skip count, score this round. Used
  // by the TV-side scoreboard.
  liveStats: Record<string, MathLiveStat> | null;
  paused: boolean;
  pauseRemainingMs: number | null;
  // Forward-compat: bees aren't spawned in v1, but the field stays so v1.1
  // can re-enable bee-occupies-digit behavior without a wire bump.
  bees: ActiveBee[];
  gameStats: GameStats;
  // Top solves per player across the whole game, shown on FINAL_RESULTS.
  playerTopSolves: Record<string, MathSolvedRecord[]> | null;
}

export interface MathPrivatePlayerState {
  currentTarget: MathTargetPublic | null;
  scoreThisRound: number;
  solved: MathSolvedRecord[];
  skipped: MathSkippedRecord[];
}

// One binary-op step in the player's solution tree. Operands reference
// either an original pool slot (0..5) or the result of a prior step
// (indexes into the steps array, 0..i-1).
export type MathOperandRef =
  | { source: "pool"; index: number }
  | { source: "step"; index: number };

export interface MathSolveStep {
  left: MathOperandRef;
  right: MathOperandRef;
  operator: MathOperator;
}

export type MathClientMessage =
  | { type: "join"; name: string; avatar: string; clientId: string }
  | { type: "rename"; name: string }
  | { type: "setAvatar"; avatar: string }
  | { type: "setHandicap"; playerId: string; multiplier: number }
  | { type: "configure"; config: Partial<RoundConfig> }
  | { type: "startGame" }
  | { type: "solveTarget"; targetId: string; steps: MathSolveStep[] }
  | { type: "skipTarget"; targetId: string }
  | { type: "nextRound" }
  | { type: "playAgain" }
  | { type: "skipWait" }
  | { type: "togglePause" }
  | { type: "resetGame" }
  | { type: "switchGames" }
  | { type: "transferHost"; playerId: string };

export type MathSolveReason =
  | "wrong_target"
  | "invalid_steps"
  | "value_mismatch"
  | "div_by_zero"
  | "div_non_integer"
  | "disallowed_operator"
  | "not_in_round";

export type MathServerMessage =
  | { type: "you"; playerId: string }
  | { type: "state"; state: MathPublicGameState }
  | { type: "private"; private: MathPrivatePlayerState }
  | {
      type: "solveResult";
      targetId: string;
      ok: boolean;
      reason?: MathSolveReason;
      points?: number;
      allSix?: boolean;
      solveMs?: number;
    }
  | { type: "skipResult"; targetId: string; ok: boolean }
  | { type: "switchGames" }
  | { type: "error"; message: string };
