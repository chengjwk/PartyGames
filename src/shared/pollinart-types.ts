// Wire protocol for Pollinart — Pictionary-meets-Telephone third game.
//
// Each round: every player owns one CHAIN. Chains run in parallel, each
// step alternating draw → guess → draw → guess. The owner of a chain
// picks its starting word, draws it, then the chain rotates through
// players in the shuffled roundOrder.
//
// Chain length policy (v1):
//   - chainLength = N (player count) if N is even.
//   - chainLength = N + 1 if N is odd  — the originator wraps back as
//     the final guesser. Guarantees the chain ends on a guess AND
//     every player participates in every chain.
//
// Step k is a "draw" step iff k is even (0, 2, 4 …), else "guess".
// Step 0 is always the originator drawing their picked seed word.

import type { Phase, Player } from "./types";

export type PollinartComplexity = "easy" | "medium" | "hard";

// A single mark in a drawing — either a pen stroke (or eraser stroke,
// which paints in the canvas background color) or a flood-fill operation.
// Coordinates are normalized to 0..1000 so receivers can render at any
// display size. The fill mark just stores its seed point + target color
// — the receiver re-runs the flood fill against the canvas state up to
// that point, giving deterministic playback as long as both sides
// render the prior marks identically.
export type DrawStroke = StrokeMark | FillMark;

export interface StrokeMark {
  kind: "stroke";
  color: string;       // CSS hex color
  width: number;       // brush width in normalized units (1..40 typical)
  points: Array<{ x: number; y: number }>;
  // True if this stroke was drawn with the eraser tool — receiver should
  // paint in the canvas background color, not stroke.color.
  erase?: boolean;
}

export interface FillMark {
  kind: "fill";
  color: string;       // CSS hex color
  x: number;           // seed point in 0..1000 normalized coords
  y: number;
}

export interface Drawing {
  strokes: DrawStroke[];
}

// A discrete step in a chain. Server stores these as players submit.
export type ChainStep =
  | {
      index: number;
      kind: "draw";
      playerId: string;
      drawing: Drawing;
      // The word the drawer was given to draw at this step. Visible to
      // server for scoring; clients only see it during REVEAL.
      promptedWord: string;
      submittedAt: number;
      // True if the server auto-filled this step because the player
      // didn't submit before the phase timer fired (empty canvas).
      autoFilled?: boolean;
    }
  | {
      index: number;
      kind: "guess";
      playerId: string;
      guess: string;
      // The word the guesser was supposed to identify (== the previous
      // draw step's promptedWord). Used for pair-fidelity scoring.
      expectedWord: string;
      // True iff (normalized) guess equals normalized expectedWord, OR
      // their Levenshtein distance is within tolerance. This is the
      // server's auto-verdict; the drawer's rating (below) overrides
      // it for scoring purposes when set.
      isMatch: boolean;
      // The drawer of the corresponding drawing rates the guess as
      // a match or not during the reveal walkthrough. `null` (or
      // missing) means they haven't rated and we fall back to
      // `isMatch`. Scoring uses `drawerRated ?? isMatch`.
      drawerRated?: boolean | null;
      submittedAt: number;
      autoFilled?: boolean;
    };

export interface ChainPublic {
  id: string;
  startedBy: string;
  // Sequence of playerIds: index k = the player who owns step k.
  playerSequence: string[];
  // Total number of steps in this chain (== playerSequence.length).
  chainLength: number;
  // Difficulty tier of the chain's starting word — set once the
  // originator picks (or auto-picks at WORD_PICK timeout) from their
  // 2 easy + 1 medium + 1 hard choices. Drives the per-chain points
  // multiplier: easy=1x, medium=1.5x, hard=2x. Defaults to "easy"
  // before the originator has picked, which only affects the
  // pre-pick snapshot — by REVEAL every chain has its true tier set.
  tier: PollinartComplexity;
}

// Per-chain summary returned at the end of the round so clients can
// render the reveal animation. The startingWord and steps are hidden
// until REVEAL to avoid leaking ahead of time.
export interface ChainRevealed extends ChainPublic {
  startingWord: string;
  steps: ChainStep[];
  // Total points awarded for this chain (pair-fidelity + end-bonus),
  // already split across the players who earned them.
  pointsByPlayer: Record<string, number>;
}

// What a single player should be doing RIGHT NOW. The server tailors
// this per-player and never broadcasts it.
export type PollinartTask =
  | { kind: "idle" } // not in a round / waiting for everyone to submit
  | {
      kind: "pickWord";
      // Word choices for THIS player's starting word, each tagged with
      // its tier. Always served as 2 easy + 1 medium + 1 hard
      // (shuffled order) so every player gets the same mix and the
      // tier they end up playing is their choice.
      choices: Array<{ word: string; tier: PollinartComplexity }>;
      // Server is waiting for a pick until pickEndsAt; after that it
      // auto-picks choices[0] for stragglers.
      pickEndsAt: number;
    }
  | {
      kind: "draw";
      chainId: string;
      stepIndex: number;
      // The word the player must draw (their own pick if step 0, else
      // the previous guess in their currently-assigned chain).
      promptedWord: string;
      phaseEndsAt: number;
      // The next player in this chain — i.e., who's going to receive
      // your drawing and have to guess it. Null if this is the final
      // step in the chain (shouldn't happen for draw, but keep
      // optional for symmetry).
      nextPlayerId: string | null;
    }
  | {
      kind: "guess";
      chainId: string;
      stepIndex: number;
      drawing: Drawing;       // the drawing this player must guess
      phaseEndsAt: number;
      // The next player in this chain — i.e., who's going to receive
      // your guess and have to draw it. Null if this is the final
      // guess (end of chain).
      nextPlayerId: string | null;
    }
  | {
      kind: "wait";
      // Player has already submitted for this step; waiting on others.
      submitted: true;
    };

// Live status visible to host/TV during play — counts only, no content.
export interface PollinartLiveStat {
  submitted: number; // how many step-submits the player has made this round
  scoreThisRound: number;
}

// Heart / bee reactions added during REVEAL. Pure cosmetic.
export interface DrawingReaction {
  chainId: string;
  stepIndex: number;
  kind: "heart" | "bee";
  byPlayerId: string;
}

export interface PollinartRoundSummary {
  chains: ChainRevealed[];
  // Total points earned this round per player (sum across all chains).
  perPlayer: Record<string, number>;
  // Aggregated reaction tally for the round (chainId+stepIndex -> counts).
  reactions: Record<string, { heart: number; bee: number }>;
}

// Cross-round reaction aggregate, populated at FINAL_RESULTS.
// `topDrawings` is sorted descending by (heart + bee) total — the
// "most-loved drawing of the night" lineup. `perPlayer` accumulates
// every reaction received on a player's drawings across the game.
export interface PollinartReactionsSummary {
  topDrawings: Array<{
    drawing: Drawing;
    drawerId: string;
    chainId: string;
    stepIndex: number;
    promptedWord: string;
    roundNumber: number;
    heart: number;
    bee: number;
  }>;
  perPlayer: Record<string, { heart: number; bee: number }>;
}

export interface PollinartPublicGameState {
  phase: Phase | "WORD_PICK" | "DRAW_PHASE" | "GUESS_PHASE" | "REVEAL";
  config: {
    totalRounds: number;
    drawSeconds: number;
    guessSeconds: number;
    pickSeconds: number;
  };
  players: Player[];
  hostPlayerId: string | null;
  currentRound: number;
  totalScores: Record<string, number>;
  // Step index within the current round (0-based). Even = draw, odd = guess.
  stepIndex: number | null;
  // ms epoch at which the current step's submission window closes.
  phaseEndsAt: number | null;
  // ms epoch when ROUND_STARTING countdown ends.
  roundStartsAt: number | null;
  // Lightweight chain map for the host TV (so it can show progress).
  // Full chain content is only sent during REVEAL.
  chains: ChainPublic[] | null;
  // Submission progress for the CURRENT step: how many of the players who
  // owe a submission have submitted. Updated live as taps land.
  stepSubmittedCount: number;
  stepExpectedCount: number;
  // Live counts per player (cumulative submissions this round).
  liveStats: Record<string, PollinartLiveStat> | null;
  // Populated at ROUND_RESULTS — full reveal payload + per-player totals.
  roundSummary: PollinartRoundSummary | null;
  // REVEAL state: which chain the host is currently walking through.
  // -1 / null = not in reveal; 0..chains.length-1 = currently showing chain k.
  revealChainIndex: number | null;
  // Within the revealed chain, which step is currently uncovered (host
  // taps to advance). 0..chainLength-1, or -1 = only the seed word shown.
  revealStepIndex: number | null;
  paused: boolean;
  // Cross-round reaction summary. Only populated at FINAL_RESULTS;
  // null in every other phase.
  reactionsSummary: PollinartReactionsSummary | null;
}

export interface PollinartPrivateState {
  task: PollinartTask;
  scoreThisRound: number;
}

export type PollinartClientMessage =
  | { type: "join"; name: string; avatar: string; clientId: string }
  | { type: "rename"; name: string }
  | { type: "setAvatar"; avatar: string }
  | { type: "setHandicap"; playerId: string; multiplier: number }
  | {
      type: "configure";
      config: Partial<{
        totalRounds: number;
        drawSeconds: number;
        guessSeconds: number;
        pickSeconds: number;
      }>;
    }
  | { type: "startGame" }
  | { type: "pickWord"; word: string }
  | { type: "submitDrawing"; chainId: string; stepIndex: number; drawing: Drawing }
  | { type: "submitGuess"; chainId: string; stepIndex: number; guess: string }
  | { type: "reactToDrawing"; chainId: string; stepIndex: number; kind: "heart" | "bee" }
  // Drawer's verdict on the guess made of their drawing during reveal.
  // `guessStepIndex` is the index of the GUESS step being rated.
  | { type: "ratePair"; chainId: string; guessStepIndex: number; matched: boolean }
  | { type: "advanceReveal" } // host: tap to uncover the next step
  | { type: "nextRound" }
  | { type: "playAgain" }
  | { type: "skipWait" } // host: end the current submission window early
  | { type: "togglePause" }
  | { type: "resetGame" }
  | { type: "switchGames" }
  | { type: "transferHost"; playerId: string };

export type PollinartServerMessage =
  | { type: "you"; playerId: string }
  | { type: "state"; state: PollinartPublicGameState }
  | { type: "private"; private: PollinartPrivateState }
  | { type: "switchGames" }
  | { type: "error"; message: string };
