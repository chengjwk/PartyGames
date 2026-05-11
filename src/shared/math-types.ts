// Wire types for MathHive. Mirrors the wordhive shape but with digits +
// operators in place of letters, and equations in place of words.
//
// Most of the "framework" types (Player, RoundConfig, Phase, ActiveBee,
// GameStats, RoundSummary basics) are reused from ../shared/types.ts.

import type { Player, RoundConfig, ActiveBee, Phase, GameStats } from "./types";

export type MathOperator = "+" | "-" | "*" | "/";

export interface MathPuzzlePublic {
  digits: string[]; // 7 single-digit strings; index 0 = center, 1..6 outer
  // operators are always {+, -, *, /} so no need to ship them
}

export interface ScoredEquation {
  equation: string; // normalized form like "2+3=5"
  points: number;
  pangram: boolean; // all 7 puzzle digits used at least once
  firstFinder: boolean;
  beeBonus?: boolean;
}

export interface MathPlayerRoundResult {
  playerId: string;
  equations: ScoredEquation[];
  scoreThisRound: number;
}

export interface MathRoundSummary {
  digits: string[];
  perPlayer: MathPlayerRoundResult[];
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
  liveCounts: Record<string, number> | null;
  paused: boolean;
  pauseRemainingMs: number | null;
  bees: ActiveBee[];
  gameStats: GameStats;
  easyModeStats: { foundEquations: string[] } | null;
  playerTopEquations: Record<string, ScoredEquation[]> | null;
}

export interface MathPrivatePlayerState {
  foundEquations: ScoredEquation[];
  scoreThisRound: number;
}

export type MathClientMessage =
  | { type: "join"; name: string; avatar: string; clientId: string }
  | { type: "rename"; name: string }
  | { type: "setAvatar"; avatar: string }
  | { type: "setHandicap"; playerId: string; multiplier: number }
  | { type: "configure"; config: Partial<RoundConfig> }
  | { type: "startGame" }
  | { type: "submitEquation"; equation: string }
  | { type: "nextRound" }
  | { type: "playAgain" }
  | { type: "skipWait" }
  | { type: "togglePause" }
  | { type: "resetGame" };

export type MathSubmitReason =
  | "too_short"
  | "missing_center"
  | "invalid_token"
  | "no_equals"
  | "two_sides"
  | "no_operator"
  | "div_by_zero"
  | "not_equal"
  | "already_found"
  | "not_in_round";

export type MathServerMessage =
  | { type: "you"; playerId: string }
  | { type: "state"; state: MathPublicGameState }
  | { type: "private"; private: MathPrivatePlayerState }
  | {
      type: "submitResult";
      equation: string;
      ok: boolean;
      reason?: MathSubmitReason;
      points?: number;
      pangram?: boolean;
      firstFinder?: boolean;
    }
  | { type: "error"; message: string };
