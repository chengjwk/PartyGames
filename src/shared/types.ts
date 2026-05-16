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

export type GameMode = "classic" | "swarm";

export interface ActiveBee {
  letter: string;
  // -1 = floating 8th letter (classic), 0 = center (queen only), 1-6 = outer hex
  slot: number;
  multiplier: number; // 1 in classic (bee gives access only); 1.5/2/3/5 in swarm
  leaveAt: number;
  queen?: boolean;
}

export type MathDifficulty = "easy" | "medium" | "hard";

export interface RoundConfig {
  totalRounds: number;
  roundDurationSeconds: number;
  easyMode: boolean;
  mode: GameMode;
  // MathHive-only: difficulty selects the operator set and (in v1.1+) hard's
  // auto-reroll behavior. WordHive ignores this field.
  mathDifficulty: MathDifficulty;
}

export const DEFAULT_CONFIG: RoundConfig = {
  totalRounds: 3,
  roundDurationSeconds: 60,
  easyMode: true,
  mode: "classic",
  mathDifficulty: "medium",
};

export const SWARM_MIN_DURATION_SECONDS = 60;
export const SWARM_DEFAULT_DURATION_SECONDS = 90;

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
  // Bees currently on the board.
  // Classic mode: 0 or 1 bee, "carrying" an 8th letter (slot = -1).
  // Swarm mode: any number of bees, each landed on a specific hex slot
  // (0 = center for the queen; 1-6 = outer hexes). Each carries its own
  // multiplier and replaces the original letter while present.
  bees: ActiveBee[];
  gameStats: GameStats;
  // Easy mode: total valid word count + every word found across the room.
  // Populated only when config.easyMode is on and a round is in progress.
  easyModeStats: { totalValid: number; foundWords: string[] } | null;
  // Epoch ms of the last pangram found by anyone in this round. Used by the
  // host display to play a celebratory chime when a new pangram lands.
  lastPangramAt: number | null;
  // Top 10 highest-scoring words per player across the whole game. Populated
  // only at FINAL_RESULTS so the host can showcase each player's best plays.
  playerTopWords: Record<string, ScoredWord[]> | null;
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
  | { type: "skipWait" } // host: resume even if some players are still disconnected
  | { type: "togglePause" } // any player can pause/resume an active round
  | { type: "resetGame" } // bail back to LOBBY of this game
  | { type: "switchGames" }; // host: kick everyone back to the pre-game picker

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
  | { type: "switchGames" }
  | { type: "error"; message: string };
