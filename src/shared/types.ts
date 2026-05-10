// Shared message + state types between the PartyKit server and React clients.

export type Phase =
  | "LOBBY"
  | "ROUND_STARTING" // 3s countdown before play
  | "ROUND_PLAYING"
  | "ROUND_RESULTS"
  | "FINAL_RESULTS";

export interface Player {
  id: string;
  name: string;
  avatar: string; // emoji from AVATARS
  scoreMultiplier: number; // 1 = no handicap; 1.25 / 1.5 / 2 give younger players a boost
  connected: boolean;
}

export interface RoundConfig {
  totalRounds: number;
  roundDurationSeconds: number;
  easyMode: boolean;
}

export const DEFAULT_CONFIG: RoundConfig = {
  totalRounds: 3,
  roundDurationSeconds: 60,
  easyMode: true,
};

export interface PuzzlePublic {
  letters: string[]; // 7 letters; index 0 is the center, 1..6 outer
  bonusLetter: string; // outer letter; words containing it score 2x
}

export interface ScoredWord {
  word: string;
  points: number;
  isPangram: boolean;
  firstFinder: boolean;
  // True when the word benefited from the fixed 2x letter or an active bee.
  // Lets the UI add a star/sparkle on those word chips later.
  bonusLetter?: boolean;
  beeBonus?: boolean;
}

export interface PlayerRoundResult {
  playerId: string;
  words: ScoredWord[];
  scoreThisRound: number;
}

export interface RoundSummary {
  letters: string[];
  pangrams: string[];
  perPlayer: PlayerRoundResult[];
  // word -> definition. Populated asynchronously after round end (defs come
  // from a free dictionary API; missing entries just don't render).
  definitions: Record<string, string>;
}

// Best word stats accumulated across all rounds in a game; used to call out
// "longest word" / "highest-scoring word" on the final results screen.
export interface GameStats {
  longest: { word: string; playerId: string } | null;
  highest: { word: string; points: number; playerId: string } | null;
}

export interface PublicGameState {
  phase: Phase;
  config: RoundConfig;
  players: Player[];
  hostPlayerId: string | null;
  currentRound: number;
  totalScores: Record<string, number>;
  puzzle: PuzzlePublic | null;
  roundStartsAt: number | null; // ms epoch; non-null during ROUND_STARTING
  roundEndsAt: number | null; // ms epoch; non-null during ROUND_PLAYING (and not paused)
  roundSummary: RoundSummary | null;
  liveCounts: Record<string, number> | null;
  // Auto-pause: true when at least one player is disconnected and the round
  // timer has been frozen. Resumes automatically on reconnect; host can also
  // force-resume via the `skipWait` message.
  paused: boolean;
  pauseRemainingMs: number | null;
  // A bee that periodically lands on an outer letter (15s windows on a 30s
  // cadence, starting at +30s). Words containing the bee letter while it's
  // active score 2x (stacks with bonusLetter for up to 4x).
  beeLetter: string | null;
  beeUntilMs: number | null; // epoch ms when this bee leaves
  gameStats: GameStats;
  // Easy mode: total valid word count + every word found across the room.
  // Populated only when config.easyMode is on and a round is in progress.
  easyModeStats: { totalValid: number; foundWords: string[] } | null;
  // Epoch ms of the last pangram found by anyone in this round. Used by the
  // host display to play a celebratory chime when a new pangram lands.
  lastPangramAt: number | null;
}

export interface PrivatePlayerState {
  foundWords: ScoredWord[];
  scoreThisRound: number;
}

export type ClientMessage =
  | { type: "join"; name: string; avatar: string; clientId: string }
  | { type: "rename"; name: string }
  | { type: "setAvatar"; avatar: string }
  | { type: "setHandicap"; playerId: string; multiplier: number }
  | { type: "configure"; config: Partial<RoundConfig> }
  | { type: "startGame" }
  | { type: "submitWord"; word: string }
  | { type: "nextRound" }
  | { type: "playAgain" }
  | { type: "skipWait" }; // host: resume even if some players are still disconnected

export type SubmitReason =
  | "too_short"
  | "missing_center"
  | "invalid_letter"
  | "not_a_word"
  | "already_found"
  | "not_in_round";

export type ServerMessage =
  | { type: "you"; playerId: string }
  | { type: "state"; state: PublicGameState }
  | { type: "private"; private: PrivatePlayerState }
  | {
      type: "submitResult";
      word: string;
      ok: boolean;
      reason?: SubmitReason;
      points?: number;
      isPangram?: boolean;
      firstFinder?: boolean;
    }
  | { type: "error"; message: string };
