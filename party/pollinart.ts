// Pollinart server (v1).
//
// Pictionary meets Telephone. Each round:
//   1. Each player picks a starting word from 3 choices (WORD_PICK).
//   2. Step 0 = each player draws their own seed word (DRAW_PHASE).
//   3. Step 1 = each player receives one drawing, types a guess
//      (GUESS_PHASE). The chain rotates by player position.
//   4. Alternates draw/guess for chainLength steps. Chain length = N
//      players, or N+1 for odd N so the chain always ends on a guess
//      and every player participates in every chain.
//   5. REVEAL: host walks the room through each chain, original word
//      to final guess, animated step-by-step.
//   6. ROUND_RESULTS / FINAL_RESULTS.
//
// Scoring (v1): pair-fidelity. At each guess step k, compare the
// guess to the word the drawer at step k-1 was prompted with. If they
// match (exact, case-insensitive, Levenshtein ≤ 2), both the drawer
// and guesser get +3. Optional end-of-chain bonus: if the final guess
// matches the seed word, +5 to everyone in the chain.

import type * as Party from "partykit/server";
import type { Player } from "../src/shared/types";
import type {
  ChainPublic,
  ChainRevealed,
  ChainStep,
  Drawing,
  DrawingReaction,
  PollinartClientMessage,
  PollinartComplexity,
  PollinartLiveStat,
  PollinartPrivateState,
  PollinartPublicGameState,
  PollinartReactionsSummary,
  PollinartRoundSummary,
  PollinartServerMessage,
  PollinartTask,
} from "../src/shared/pollinart-types";
import {
  buildMixedDecks,
  dealChoices,
  tierMixForCount,
} from "../src/data/pollinart-words";

const COUNTDOWN_MS = 3000;
const PAUSE_GRACE_MS = 3000;

// Min players to start a Pollinart round — chains don't pass meaningfully
// with fewer. Players can still join the lobby but Start is gated.
const MIN_PLAYERS = 3;

const EXACT_MATCH_POINTS = 3;
// Bonus to everyone in the chain when the final guess matches the
// seed word — "you all kept the chain alive."
const END_BONUS_POINTS = 5;
// Extra bonus on top of END_BONUS_POINTS to the chain's originator —
// rewards the player whose seed word held up through the telephone.
const ORIGINATOR_BONUS_POINTS = 7;
// Levenshtein cap for "near-exact" — covers most typos and spelling
// drift. Combined with whitespace-stripped normalization this also
// papers over "hot dog" vs "hotdog" and similar spacing variants.
const LEV_TOLERANCE = 3;

// Per-tier points multiplier. Every round is a mix (2 easy / 1 medium
// / 1 hard for 4p, scaled otherwise), so the medium and hard chains
// are higher-stakes lanes that reward everyone in them more. This
// multiplier compounds with each player's `scoreMultiplier` handicap.
const TIER_MULTIPLIER: Record<PollinartComplexity, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

interface PollinartConfig {
  totalRounds: number;
  drawSeconds: number;
  guessSeconds: number;
  pickSeconds: number;
}

const DEFAULT_CONFIG: PollinartConfig = {
  totalRounds: 3,
  // 75s / 30s after second playtest — 60s was still hurried and 15s
  // wasn't enough time to type a guess once you saw the drawing.
  drawSeconds: 75,
  guessSeconds: 30,
  pickSeconds: 10,
};

type PollinartPhase =
  | "LOBBY"
  | "ROUND_STARTING"
  | "WORD_PICK"
  | "DRAW_PHASE"
  | "GUESS_PHASE"
  | "REVEAL"
  | "ROUND_RESULTS"
  | "FINAL_RESULTS";

interface InternalChain {
  id: string;
  startedBy: string;
  startingWord: string | null; // null until owner picks
  playerSequence: string[];    // playerIds in chain order
  steps: ChainStep[];          // grows one per step submission round
  // Difficulty tier the chain's starting word was drawn from. Drives
  // per-chain scoring multiplier (see TIER_MULTIPLIER).
  tier: PollinartComplexity;
}

interface PerPlayerRoundState {
  // The 3 word choices we offered this player at WORD_PICK.
  pickChoices: string[];
  // The player's chosen starting word (null until they pick or auto).
  pickedWord: string | null;
  // Reactions this player has placed during REVEAL (chainId|stepIndex -> kind).
  reactions: Map<string, "heart" | "bee">;
  scoreThisRound: number;
  // Total step submissions (for liveStats).
  submitted: number;
}

export default class PollinartServer implements Party.Server {
  // ───── identity ─────
  private players = new Map<string, Player>();
  private joinOrder: string[] = [];
  private connToClient = new Map<string, string>();
  private hostConns = new Set<string>();

  // ───── game state ─────
  private phase: PollinartPhase = "LOBBY";
  private config: PollinartConfig = { ...DEFAULT_CONFIG };
  private currentRound = 0;
  private hostPlayerId: string | null = null;
  private totalScores = new Map<string, number>();

  // Round-scoped state. Each round builds one shuffled deck per tier
  // (mixed-tier dealing) and tracks an independent cursor per deck so
  // word picks for one tier don't shift cursors for the others.
  private decksByTier: Record<PollinartComplexity, string[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  private cursorsByTier: Record<PollinartComplexity, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  private perPlayer = new Map<string, PerPlayerRoundState>();
  private chains: InternalChain[] = [];
  private stepIndex = 0;
  private chainLength = 0;
  // Submissions for the CURRENT step, keyed by chain id.
  private currentStepSubmitted = new Set<string>();

  // Reveal state
  private revealChainIndex: number | null = null;
  private revealStepIndex: number | null = null;
  private roundSummary: PollinartRoundSummary | null = null;

  // Timers
  private phaseEndsAt: number | null = null;
  private roundStartsAt: number | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;

  // Pause
  private paused = false;
  private pauseRemainingMs: number | null = null;
  private pauseGraceTimer: ReturnType<typeof setTimeout> | null = null;

  // Reactions (round-scoped). Map of `${chainId}|${stepIndex}` -> reactions array.
  private reactions = new Map<string, DrawingReaction[]>();
  // What `applyScoring` last added to `totalScores`, per player. We
  // subtract this before re-applying so that re-running the scorer
  // (e.g., after a drawer vote during reveal) doesn't double-count.
  // Cleared at the start of each round in `resetRoundState`.
  private lastAppliedContribution = new Map<string, number>();
  // Each completed round's full summary, accumulated for the
  // "most-loved drawing of the night" recap at FINAL_RESULTS.
  // Cleared at game start / `handlePlayAgain`.
  private completedRoundSummaries: Array<{
    roundNumber: number;
    summary: PollinartRoundSummary;
  }> = [];

  private nextChainSerial = 1;

  constructor(readonly room: Party.Room) {}

  // ───── connection lifecycle ─────
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const role = new URL(ctx.request.url).searchParams.get("role") ?? "player";
    if (role === "host") this.hostConns.add(conn.id);
    this.send(conn, { type: "you", playerId: conn.id });
    this.send(conn, { type: "state", state: this.snapshot() });
  }

  onClose(conn: Party.Connection) {
    this.hostConns.delete(conn.id);
    const cid = this.connToClient.get(conn.id);
    if (!cid) return;
    this.connToClient.delete(conn.id);
    const stillHere = [...this.connToClient.values()].includes(cid);
    if (!stillHere) {
      const p = this.players.get(cid);
      if (p) p.connected = false;
      // Host is sticky — see other servers. transferHost is the
      // explicit handoff path.
      this.maybeSchedulePause();
    }
    this.broadcastState();
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: PollinartClientMessage;
    try {
      msg = JSON.parse(raw) as PollinartClientMessage;
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
      case "pickWord":
        this.handlePickWord(sender, msg);
        return;
      case "submitDrawing":
        this.handleSubmitDrawing(sender, msg);
        return;
      case "submitGuess":
        this.handleSubmitGuess(sender, msg);
        return;
      case "reactToDrawing":
        this.handleReaction(sender, msg);
        return;
      case "ratePair":
        this.handleRatePair(sender, msg);
        return;
      case "advanceReveal":
        if (this.isHost(sender)) this.handleAdvanceReveal();
        return;
      case "nextRound":
        if (this.isHost(sender)) this.handleNextRound();
        return;
      case "playAgain":
        if (this.isHost(sender)) this.handlePlayAgain();
        return;
      case "skipWait":
        if (this.isHost(sender)) this.handleSkipWait();
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
      case "transferHost":
        this.handleTransferHost(sender, msg);
        return;
    }
  }

  // Host transfer. Current host can delegate; if the current host is
  // offline anyone can claim. Server-gated.
  private handleTransferHost(
    sender: Party.Connection,
    msg: { playerId: string },
  ) {
    const senderCid = this.connToClient.get(sender.id);
    if (!senderCid) return;
    const target = this.players.get(msg.playerId);
    if (!target) return;
    const currentHost = this.hostPlayerId
      ? this.players.get(this.hostPlayerId)
      : null;
    const hostConnected = !!currentHost?.connected;
    if (hostConnected && senderCid !== this.hostPlayerId) return;
    this.hostPlayerId = msg.playerId;
    this.broadcastState();
  }

  // ───── join / config ─────
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
    // Sticky host. transferHost is the explicit handoff path.
    if (!this.hostPlayerId || !this.players.get(this.hostPlayerId)) {
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

  private handleConfigure(msg: { config: Partial<PollinartConfig> }) {
    if (this.phase !== "LOBBY") return;
    const next = { ...this.config };
    if (typeof msg.config.totalRounds === "number") {
      next.totalRounds = clamp(Math.round(msg.config.totalRounds), 1, 10);
    }
    if (typeof msg.config.drawSeconds === "number") {
      next.drawSeconds = clamp(Math.round(msg.config.drawSeconds), 15, 180);
    }
    if (typeof msg.config.guessSeconds === "number") {
      next.guessSeconds = clamp(Math.round(msg.config.guessSeconds), 5, 60);
    }
    if (typeof msg.config.pickSeconds === "number") {
      next.pickSeconds = clamp(Math.round(msg.config.pickSeconds), 3, 60);
    }
    this.config = next;
    this.broadcastState();
  }

  // ───── round lifecycle ─────
  private handleStartGame() {
    if (this.phase !== "LOBBY") return;
    const connectedPlayers = this.connectedPlayers();
    if (connectedPlayers.length < MIN_PLAYERS) return;
    this.totalScores.clear();
    for (const cid of this.players.keys()) this.totalScores.set(cid, 0);
    this.currentRound = 0;
    this.completedRoundSummaries = [];
    this.beginCountdown();
  }

  private beginCountdown() {
    this.currentRound += 1;
    // Build fresh per-tier decks for the round so each chain's starting
    // word comes from its assigned tier with no cross-round repeats.
    this.decksByTier = buildMixedDecks();
    this.cursorsByTier = { easy: 0, medium: 0, hard: 0 };
    this.perPlayer.clear();
    this.chains = [];
    this.stepIndex = 0;
    this.currentStepSubmitted.clear();
    this.reactions.clear();
    this.revealChainIndex = null;
    this.revealStepIndex = null;
    this.roundSummary = null;
    this.phaseEndsAt = null;

    this.roundStartsAt = Date.now() + COUNTDOWN_MS;
    this.phase = "ROUND_STARTING";
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = setTimeout(() => this.beginWordPick(), COUNTDOWN_MS);
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private beginWordPick() {
    if (this.phase !== "ROUND_STARTING") return;
    this.roundStartsAt = null;
    // Establish the round's player order — shuffled connected players.
    const connected = this.connectedPlayers();
    const shuffled = shuffle(connected.map((p) => p.id));
    // Chain length: largest even number ≤ N. Ensures the chain always
    // ends on a guess AND never wraps back to the originator (so no
    // one ends up guessing a drawing they themselves drew). For odd
    // player counts the last player in each chain is "off" — we
    // rotate which one across chains so participation evens out.
    this.chainLength =
      shuffled.length % 2 === 0 ? shuffled.length : shuffled.length - 1;
    // Assign a difficulty tier per chain. The mix (2 easy / 1 medium /
    // 1 hard at 4p, scaled at other counts) is shuffled so it isn't
    // always the same originator stuck with hard.
    const tiers = shuffle(tierMixForCount(shuffled.length));
    this.chains = shuffled.map((ownerId, k) => {
      // Chain k's player sequence rotates starting at k for chainLength entries.
      const seq: string[] = [];
      for (let s = 0; s < this.chainLength; s++) {
        seq.push(shuffled[(k + s) % shuffled.length]);
      }
      return {
        id: `C${this.currentRound}-${this.nextChainSerial++}`,
        startedBy: ownerId,
        startingWord: null,
        playerSequence: seq,
        steps: [],
        tier: tiers[k] ?? "easy",
      };
    });
    // Deal 3 word choices to each connected player from the deck
    // matching THEIR chain's tier. Each tier deck has an independent
    // cursor so picks for one tier don't shift cursors for the others.
    const k = 3;
    for (const p of connected) {
      const ownChain = this.chains.find((c) => c.startedBy === p.id);
      const tier: PollinartComplexity = ownChain?.tier ?? "easy";
      const choices = dealChoices(
        this.decksByTier[tier],
        this.cursorsByTier[tier],
        k,
      );
      this.cursorsByTier[tier] += k;
      this.perPlayer.set(p.id, {
        pickChoices: choices,
        pickedWord: null,
        reactions: new Map(),
        scoreThisRound: 0,
        submitted: 0,
      });
    }
    this.phase = "WORD_PICK";
    this.startTimedPhase(this.config.pickSeconds, () => this.endWordPick());
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private endWordPick() {
    if (this.phase !== "WORD_PICK") return;
    // Auto-pick for stragglers: first choice in their offered list.
    for (const chain of this.chains) {
      if (chain.startingWord !== null) continue;
      const st = this.perPlayer.get(chain.startedBy);
      if (!st) {
        chain.startingWord = "ghost"; // shouldn't happen
        continue;
      }
      if (st.pickedWord) {
        chain.startingWord = st.pickedWord;
      } else if (st.pickChoices.length > 0) {
        chain.startingWord = st.pickChoices[0];
        st.pickedWord = chain.startingWord;
      } else {
        chain.startingWord = "mystery";
      }
    }
    this.beginStep(0);
  }

  // ───── step phases (draw/guess alternation) ─────
  private beginStep(stepIndex: number) {
    this.stepIndex = stepIndex;
    this.currentStepSubmitted.clear();
    const isDraw = stepIndex % 2 === 0;
    this.phase = isDraw ? "DRAW_PHASE" : "GUESS_PHASE";
    const secs = isDraw ? this.config.drawSeconds : this.config.guessSeconds;
    this.startTimedPhase(secs, () => this.endStep());
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private endStep() {
    if (this.phase !== "DRAW_PHASE" && this.phase !== "GUESS_PHASE") return;
    // Auto-fill any chain that didn't submit this step.
    for (const chain of this.chains) {
      const already = chain.steps.find((s) => s.index === this.stepIndex);
      if (already) continue;
      const ownerId = chain.playerSequence[this.stepIndex];
      if (this.phase === "DRAW_PHASE") {
        chain.steps.push({
          index: this.stepIndex,
          kind: "draw",
          playerId: ownerId,
          drawing: { strokes: [] },
          promptedWord: this.promptedWordFor(chain, this.stepIndex),
          submittedAt: Date.now(),
          autoFilled: true,
        });
      } else {
        const expected = this.expectedWordFor(chain, this.stepIndex);
        chain.steps.push({
          index: this.stepIndex,
          kind: "guess",
          playerId: ownerId,
          guess: "",
          expectedWord: expected,
          isMatch: false,
          submittedAt: Date.now(),
          autoFilled: true,
        });
      }
    }
    // Sort steps within each chain just in case.
    for (const chain of this.chains) {
      chain.steps.sort((a, b) => a.index - b.index);
    }
    const next = this.stepIndex + 1;
    if (next >= this.chainLength) {
      // All steps complete — move to REVEAL.
      this.beginReveal();
    } else {
      this.beginStep(next);
    }
  }

  // What word should the drawer at step k draw?
  //   - k = 0 → the chain's startingWord
  //   - k even, k > 0 → the previous guess (step k-1)
  private promptedWordFor(chain: InternalChain, stepIndex: number): string {
    if (stepIndex === 0) return chain.startingWord ?? "";
    const prev = chain.steps.find((s) => s.index === stepIndex - 1);
    if (prev && prev.kind === "guess") return prev.guess;
    return "";
  }

  // What word should the guesser at step k be identifying?
  //   The prompt of the immediately-prior draw step (step k-1, kind draw).
  private expectedWordFor(chain: InternalChain, stepIndex: number): string {
    const prev = chain.steps.find((s) => s.index === stepIndex - 1);
    if (prev && prev.kind === "draw") return prev.promptedWord;
    return chain.startingWord ?? "";
  }

  // ───── reveal ─────
  private beginReveal() {
    // Score the round up-front so `roundSummary` is populated as soon
    // as the REVEAL phase starts. Without this the clients see
    // `state.roundSummary === null` for the entire reveal and just
    // render "Preparing reveal…" forever.
    this.applyScoring();
    this.phase = "REVEAL";
    this.revealChainIndex = 0;
    this.revealStepIndex = -1; // start with only the seed word visible
    this.phaseEndsAt = null;
    this.clearPhaseTimer();
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private handleAdvanceReveal() {
    if (this.phase !== "REVEAL") return;
    if (this.revealChainIndex === null) return;
    const chain = this.chains[this.revealChainIndex];
    if (!chain) return;
    const curStep = this.revealStepIndex ?? -1;
    // Advance by pairs: each tap reveals one (draw, guess) pair
    // together rather than uncovering steps one at a time. After
    // advance, revealStepIndex always lands on a guess step (odd
    // index), or stays at -1 if only the seed is showing.
    const next = curStep < 0 ? 1 : curStep + 2;
    if (next <= chain.playerSequence.length - 1) {
      this.revealStepIndex = next;
    } else {
      const nextChain = this.revealChainIndex + 1;
      if (nextChain >= this.chains.length) {
        this.endReveal();
        return;
      }
      this.revealChainIndex = nextChain;
      this.revealStepIndex = -1;
    }
    this.broadcastState();
  }

  private endReveal() {
    // Scoring already ran at beginReveal — just flip phase + clear
    // the reveal cursor. Snapshot this round's full summary for the
    // cross-round "most-loved drawing of the night" recap shown at
    // FINAL_RESULTS.
    if (this.roundSummary) {
      this.completedRoundSummaries.push({
        roundNumber: this.currentRound,
        summary: this.roundSummary,
      });
    }
    this.revealChainIndex = null;
    this.revealStepIndex = null;
    this.phase = "ROUND_RESULTS";
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  // Aggregate every drawing-step's reactions across all completed
  // rounds. Used at FINAL_RESULTS to surface the most-loved drawings
  // of the night + per-player reaction totals.
  private computeReactionsSummary(): PollinartReactionsSummary {
    type Entry = PollinartReactionsSummary["topDrawings"][number];
    const entries: Entry[] = [];
    const perPlayer: Record<string, { heart: number; bee: number }> = {};
    for (const { roundNumber, summary } of this.completedRoundSummaries) {
      for (const chain of summary.chains) {
        for (const step of chain.steps) {
          if (step.kind !== "draw") continue;
          const key = `${chain.id}|${step.index}`;
          const r = summary.reactions[key] ?? { heart: 0, bee: 0 };
          if (r.heart === 0 && r.bee === 0) continue;
          entries.push({
            drawing: step.drawing,
            drawerId: step.playerId,
            chainId: chain.id,
            stepIndex: step.index,
            promptedWord: step.promptedWord,
            roundNumber,
            heart: r.heart,
            bee: r.bee,
          });
          const tot = perPlayer[step.playerId] ?? { heart: 0, bee: 0 };
          tot.heart += r.heart;
          tot.bee += r.bee;
          perPlayer[step.playerId] = tot;
        }
      }
    }
    entries.sort((a, b) => b.heart + b.bee - (a.heart + a.bee));
    // Cap at top 5 so the FINAL_RESULTS payload stays bounded.
    return { topDrawings: entries.slice(0, 5), perPlayer };
  }

  // ───── scoring ─────
  private applyScoring() {
    // Subtract last contribution from totalScores so re-running this
    // function (e.g., after a drawer vote) doesn't double-add.
    for (const [pid, amt] of this.lastAppliedContribution) {
      this.totalScores.set(pid, (this.totalScores.get(pid) ?? 0) - amt);
    }
    this.lastAppliedContribution.clear();
    const perPlayerTotals = new Map<string, number>();
    const summaryChains: ChainRevealed[] = [];
    for (const chain of this.chains) {
      // Tier multiplier — every player who scores in this chain gets
      // their amount scaled before the handicap. medium=1.5x, hard=2x.
      const tierMult = TIER_MULTIPLIER[chain.tier] ?? 1;
      const pointsByPlayer: Record<string, number> = {};
      const award = (pid: string, amount: number) => {
        const p = this.players.get(pid);
        const handicap = p?.scoreMultiplier ?? 1;
        const total = Math.round(amount * tierMult * handicap);
        pointsByPlayer[pid] = (pointsByPlayer[pid] ?? 0) + total;
        perPlayerTotals.set(pid, (perPlayerTotals.get(pid) ?? 0) + total);
      };
      for (const step of chain.steps) {
        if (step.kind !== "guess") continue;
        // Auto-verdict via the loosened fuzzy matcher.
        step.isMatch = compareWords(step.guess, step.expectedWord);
        // Drawer's vote overrides the auto-verdict when present.
        const matched = step.drawerRated ?? step.isMatch;
        if (matched) {
          // Drawer (step.index-1) and guesser both score.
          award(step.playerId, EXACT_MATCH_POINTS);
          const prev = chain.steps.find((s) => s.index === step.index - 1);
          if (prev && prev.kind === "draw") {
            award(prev.playerId, EXACT_MATCH_POINTS);
          }
        }
      }
      // End-of-chain bonus: final guess matches seed word. Everyone
      // in the chain shares a base bonus; the originator gets an
      // extra reward on top because their seed word made it through
      // the whole telephone.
      const lastGuess = [...chain.steps]
        .filter((s) => s.kind === "guess")
        .sort((a, b) => b.index - a.index)[0];
      if (
        lastGuess &&
        lastGuess.kind === "guess" &&
        compareWords(lastGuess.guess, chain.startingWord ?? "")
      ) {
        const inChain = new Set<string>(chain.playerSequence);
        for (const pid of inChain) award(pid, END_BONUS_POINTS);
        if (chain.startedBy) award(chain.startedBy, ORIGINATOR_BONUS_POINTS);
      }
      summaryChains.push({
        id: chain.id,
        startedBy: chain.startedBy,
        playerSequence: chain.playerSequence,
        chainLength: chain.playerSequence.length,
        tier: chain.tier,
        startingWord: chain.startingWord ?? "",
        steps: chain.steps,
        pointsByPlayer,
      });
    }
    // Mirror into perPlayer.scoreThisRound and roll totals. Record
    // the contribution so a subsequent re-apply can undo it.
    for (const [pid, total] of perPlayerTotals) {
      const st = this.perPlayer.get(pid);
      if (st) st.scoreThisRound = total;
      this.totalScores.set(pid, (this.totalScores.get(pid) ?? 0) + total);
      this.lastAppliedContribution.set(pid, total);
    }
    // Reactions summary.
    const reactionsAgg: Record<string, { heart: number; bee: number }> = {};
    for (const [key, list] of this.reactions) {
      const agg = { heart: 0, bee: 0 };
      for (const r of list) {
        if (r.kind === "heart") agg.heart++;
        else agg.bee++;
      }
      reactionsAgg[key] = agg;
    }
    this.roundSummary = {
      chains: summaryChains,
      perPlayer: Object.fromEntries(perPlayerTotals),
      reactions: reactionsAgg,
    };
  }

  // ───── submission handlers ─────
  private handlePickWord(
    sender: Party.Connection,
    msg: { word: string },
  ) {
    if (this.phase !== "WORD_PICK") return;
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const st = this.perPlayer.get(cid);
    if (!st) return;
    const chain = this.chains.find((c) => c.startedBy === cid);
    if (!chain) return;
    if (chain.startingWord !== null) return;
    // Must pick from offered choices.
    if (!st.pickChoices.includes(msg.word)) return;
    st.pickedWord = msg.word;
    chain.startingWord = msg.word;
    this.broadcastState();
    this.sendPrivate(sender);
    // If every chain has a pick, advance.
    if (this.chains.every((c) => c.startingWord !== null)) {
      this.endWordPick();
    }
  }

  private handleSubmitDrawing(
    sender: Party.Connection,
    msg: { chainId: string; stepIndex: number; drawing: Drawing },
  ) {
    if (this.phase !== "DRAW_PHASE") return;
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const chain = this.chains.find((c) => c.id === msg.chainId);
    if (!chain) return;
    if (msg.stepIndex !== this.stepIndex) return;
    if (chain.playerSequence[this.stepIndex] !== cid) return;
    if (chain.steps.find((s) => s.index === this.stepIndex)) return;
    const sanitizedDrawing = sanitizeDrawing(msg.drawing);
    chain.steps.push({
      index: this.stepIndex,
      kind: "draw",
      playerId: cid,
      drawing: sanitizedDrawing,
      promptedWord: this.promptedWordFor(chain, this.stepIndex),
      submittedAt: Date.now(),
    });
    this.currentStepSubmitted.add(chain.id);
    const st = this.perPlayer.get(cid);
    if (st) st.submitted++;
    this.sendPrivate(sender);
    this.broadcastState();
    this.checkStepAdvance();
  }

  private handleSubmitGuess(
    sender: Party.Connection,
    msg: { chainId: string; stepIndex: number; guess: string },
  ) {
    if (this.phase !== "GUESS_PHASE") return;
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const chain = this.chains.find((c) => c.id === msg.chainId);
    if (!chain) return;
    if (msg.stepIndex !== this.stepIndex) return;
    if (chain.playerSequence[this.stepIndex] !== cid) return;
    if (chain.steps.find((s) => s.index === this.stepIndex)) return;
    const guess = (msg.guess || "").trim().slice(0, 60);
    const expected = this.expectedWordFor(chain, this.stepIndex);
    const isMatch = compareWords(guess, expected);
    chain.steps.push({
      index: this.stepIndex,
      kind: "guess",
      playerId: cid,
      guess,
      expectedWord: expected,
      isMatch,
      submittedAt: Date.now(),
    });
    this.currentStepSubmitted.add(chain.id);
    const st = this.perPlayer.get(cid);
    if (st) st.submitted++;
    this.sendPrivate(sender);
    this.broadcastState();
    this.checkStepAdvance();
  }

  // Drawer of a (draw, guess) pair rates the guess as match / no
  // match. Their vote overrides the auto-Levenshtein verdict for
  // scoring. Re-runs applyScoring so totals + summary update live
  // on the host TV / phone reveal.
  private handleRatePair(
    sender: Party.Connection,
    msg: { chainId: string; guessStepIndex: number; matched: boolean },
  ) {
    if (this.phase !== "REVEAL" && this.phase !== "ROUND_RESULTS") return;
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const chain = this.chains.find((c) => c.id === msg.chainId);
    if (!chain) return;
    const guess = chain.steps.find(
      (s) => s.index === msg.guessStepIndex && s.kind === "guess",
    );
    if (!guess || guess.kind !== "guess") return;
    // Only the drawer of the matching drawing step (index - 1) may
    // rate. The guesser themselves and bystanders can't.
    const draw = chain.steps.find(
      (s) => s.index === msg.guessStepIndex - 1 && s.kind === "draw",
    );
    if (!draw || draw.kind !== "draw") return;
    if (draw.playerId !== cid) return;
    guess.drawerRated = !!msg.matched;
    this.applyScoring();
    this.broadcastState();
  }

  private handleReaction(
    sender: Party.Connection,
    msg: { chainId: string; stepIndex: number; kind: "heart" | "bee" },
  ) {
    if (this.phase !== "REVEAL" && this.phase !== "ROUND_RESULTS") return;
    const cid = this.connToClient.get(sender.id);
    if (!cid) return;
    const key = `${msg.chainId}|${msg.stepIndex}`;
    const list = this.reactions.get(key) ?? [];
    // Toggle: if this player already placed this kind here, remove it;
    // else replace any prior reaction by this player for this step.
    const existingIdx = list.findIndex((r) => r.byPlayerId === cid);
    if (existingIdx >= 0) {
      const existing = list[existingIdx];
      if (existing.kind === msg.kind) {
        list.splice(existingIdx, 1);
      } else {
        existing.kind = msg.kind;
      }
    } else {
      list.push({
        chainId: msg.chainId,
        stepIndex: msg.stepIndex,
        kind: msg.kind,
        byPlayerId: cid,
      });
    }
    this.reactions.set(key, list);
    this.broadcastState();
  }

  // After any submit, if every chain has submitted the current step,
  // advance immediately rather than waiting for the timer.
  private checkStepAdvance() {
    if (this.phase !== "DRAW_PHASE" && this.phase !== "GUESS_PHASE") return;
    if (this.currentStepSubmitted.size >= this.chains.length) {
      this.clearPhaseTimer();
      this.endStep();
    }
  }

  private handleSkipWait() {
    if (this.phase === "WORD_PICK") {
      this.clearPhaseTimer();
      this.endWordPick();
      return;
    }
    if (this.phase === "DRAW_PHASE" || this.phase === "GUESS_PHASE") {
      this.clearPhaseTimer();
      this.endStep();
      return;
    }
    if (this.paused) this.resume();
  }

  // ───── phase timer helpers ─────
  private startTimedPhase(seconds: number, onExpire: () => void) {
    this.clearPhaseTimer();
    const ms = seconds * 1000;
    this.phaseEndsAt = Date.now() + ms;
    this.phaseTimer = setTimeout(onExpire, ms);
  }

  private clearPhaseTimer() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.phaseEndsAt = null;
  }

  // ───── round/next/final ─────
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
    this.resetRoundState();
    this.totalScores.clear();
    this.currentRound = 0;
    this.completedRoundSummaries = [];
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private resetRoundState() {
    this.clearPhaseTimer();
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
    this.decksByTier = { easy: [], medium: [], hard: [] };
    this.cursorsByTier = { easy: 0, medium: 0, hard: 0 };
    this.perPlayer.clear();
    this.chains = [];
    this.stepIndex = 0;
    this.chainLength = 0;
    this.currentStepSubmitted.clear();
    this.reactions.clear();
    this.lastAppliedContribution.clear();
    this.revealChainIndex = null;
    this.revealStepIndex = null;
    this.roundSummary = null;
    this.roundStartsAt = null;
    this.paused = false;
    this.pauseRemainingMs = null;
    if (this.pauseGraceTimer) {
      clearTimeout(this.pauseGraceTimer);
      this.pauseGraceTimer = null;
    }
  }

  private handleSwitchGames() {
    this.handleResetGame();
    this.room.broadcast(
      JSON.stringify({ type: "switchGames" } satisfies PollinartServerMessage),
    );
  }

  private handleResetGame() {
    if (this.phase === "LOBBY") return;
    this.phase = "LOBBY";
    this.resetRoundState();
    this.totalScores.clear();
    this.currentRound = 0;
    this.completedRoundSummaries = [];
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  // ───── pause ─────
  private maybeSchedulePause() {
    const playing =
      this.phase === "WORD_PICK" ||
      this.phase === "DRAW_PHASE" ||
      this.phase === "GUESS_PHASE";
    if (!playing) return;
    if (this.paused) return;
    if (this.pauseGraceTimer) return;
    this.pauseGraceTimer = setTimeout(() => {
      this.pauseGraceTimer = null;
      const anyDown = [...this.players.values()].some((p) => !p.connected);
      if (!anyDown) return;
      const stillPlaying =
        this.phase === "WORD_PICK" ||
        this.phase === "DRAW_PHASE" ||
        this.phase === "GUESS_PHASE";
      if (!stillPlaying) return;
      this.doPause();
    }, PAUSE_GRACE_MS);
  }

  private doPause() {
    if (!this.phaseEndsAt) return;
    const now = Date.now();
    this.pauseRemainingMs = Math.max(0, this.phaseEndsAt - now);
    this.clearPhaseTimer();
    this.paused = true;
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

  private resume() {
    if (!this.paused) return;
    const remaining = this.pauseRemainingMs ?? 0;
    this.paused = false;
    this.pauseRemainingMs = null;
    if (
      this.phase === "WORD_PICK" ||
      this.phase === "DRAW_PHASE" ||
      this.phase === "GUESS_PHASE"
    ) {
      const onExpire =
        this.phase === "WORD_PICK"
          ? () => this.endWordPick()
          : () => this.endStep();
      const ms = Math.max(100, remaining);
      this.phaseEndsAt = Date.now() + ms;
      this.phaseTimer = setTimeout(onExpire, ms);
    }
    this.broadcastState();
    this.broadcastAllPrivate();
  }

  private handleTogglePause() {
    const playing =
      this.phase === "WORD_PICK" ||
      this.phase === "DRAW_PHASE" ||
      this.phase === "GUESS_PHASE";
    if (!playing) return;
    if (this.paused) this.resume();
    else this.doPause();
  }

  // ───── per-player task derivation ─────
  private taskFor(cid: string): PollinartTask {
    if (this.paused) return { kind: "idle" };
    if (this.phase === "WORD_PICK") {
      const st = this.perPlayer.get(cid);
      const chain = this.chains.find((c) => c.startedBy === cid);
      if (!st || !chain) return { kind: "idle" };
      if (chain.startingWord !== null) return { kind: "wait", submitted: true };
      return {
        kind: "pickWord",
        choices: st.pickChoices,
        pickEndsAt: this.phaseEndsAt ?? 0,
      };
    }
    if (this.phase === "DRAW_PHASE" || this.phase === "GUESS_PHASE") {
      const chain = this.chains.find(
        (c) => c.playerSequence[this.stepIndex] === cid,
      );
      if (!chain) return { kind: "idle" };
      const already = chain.steps.find((s) => s.index === this.stepIndex);
      if (already) return { kind: "wait", submitted: true };
      const nextPlayerId =
        chain.playerSequence[this.stepIndex + 1] ?? null;
      if (this.phase === "DRAW_PHASE") {
        return {
          kind: "draw",
          chainId: chain.id,
          stepIndex: this.stepIndex,
          promptedWord: this.promptedWordFor(chain, this.stepIndex),
          phaseEndsAt: this.phaseEndsAt ?? 0,
          nextPlayerId,
        };
      } else {
        const prev = chain.steps.find((s) => s.index === this.stepIndex - 1);
        const drawing: Drawing =
          prev && prev.kind === "draw" ? prev.drawing : { strokes: [] };
        return {
          kind: "guess",
          chainId: chain.id,
          stepIndex: this.stepIndex,
          drawing,
          phaseEndsAt: this.phaseEndsAt ?? 0,
          nextPlayerId,
        };
      }
    }
    return { kind: "idle" };
  }

  // ───── snapshot / broadcast ─────
  private snapshot(): PollinartPublicGameState {
    let liveStats: Record<string, PollinartLiveStat> | null = null;
    if (
      this.phase === "WORD_PICK" ||
      this.phase === "DRAW_PHASE" ||
      this.phase === "GUESS_PHASE" ||
      this.phase === "REVEAL" ||
      this.phase === "ROUND_RESULTS"
    ) {
      liveStats = {};
      for (const [cid, st] of this.perPlayer) {
        liveStats[cid] = {
          submitted: st.submitted,
          scoreThisRound: st.scoreThisRound,
        };
      }
    }
    const chainsPublic: ChainPublic[] | null =
      this.phase === "LOBBY" || this.phase === "ROUND_STARTING"
        ? null
        : this.chains.map((c) => ({
            id: c.id,
            startedBy: c.startedBy,
            playerSequence: c.playerSequence,
            chainLength: c.playerSequence.length,
            tier: c.tier,
          }));
    return {
      phase: this.phase,
      config: this.config,
      players: [...this.players.values()],
      hostPlayerId: this.hostPlayerId,
      currentRound: this.currentRound,
      totalScores: Object.fromEntries(this.totalScores),
      stepIndex:
        this.phase === "DRAW_PHASE" || this.phase === "GUESS_PHASE"
          ? this.stepIndex
          : null,
      phaseEndsAt: this.phaseEndsAt,
      roundStartsAt: this.roundStartsAt,
      chains: chainsPublic,
      stepSubmittedCount: this.currentStepSubmitted.size,
      stepExpectedCount: this.chains.length,
      liveStats,
      roundSummary: this.roundSummary,
      revealChainIndex: this.revealChainIndex,
      revealStepIndex: this.revealStepIndex,
      paused: this.paused,
      // Only compute the cross-round reaction summary when we land
      // at FINAL_RESULTS — every earlier phase doesn't need it and
      // building it on every broadcast would balloon the payload.
      reactionsSummary:
        this.phase === "FINAL_RESULTS"
          ? this.computeReactionsSummary()
          : null,
    };
  }

  private privateFor(cid: string): PollinartPrivateState {
    const st = this.perPlayer.get(cid);
    return {
      task: this.taskFor(cid),
      scoreThisRound: st?.scoreThisRound ?? 0,
    };
  }

  private broadcastState() {
    this.ensureHost();
    const msg: PollinartServerMessage = { type: "state", state: this.snapshot() };
    this.room.broadcast(JSON.stringify(msg));
  }

  private broadcastAllPrivate() {
    for (const [connId, cid] of this.connToClient) {
      const conn = this.room.getConnection(connId);
      if (!conn) continue;
      const msg: PollinartServerMessage = {
        type: "private",
        private: this.privateFor(cid),
      };
      conn.send(JSON.stringify(msg));
    }
  }

  private sendPrivate(conn: Party.Connection) {
    const cid = this.connToClient.get(conn.id);
    if (!cid) return;
    const msg: PollinartServerMessage = {
      type: "private",
      private: this.privateFor(cid),
    };
    conn.send(JSON.stringify(msg));
  }

  private send(conn: Party.Connection, msg: PollinartServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  // ───── helpers ─────
  private connectedPlayers(): Player[] {
    return this.joinOrder
      .map((cid) => this.players.get(cid))
      .filter((p): p is Player => !!p && p.connected);
  }

  private electHost(): string | null {
    for (const cid of this.joinOrder) {
      const p = this.players.get(cid);
      if (p?.connected) return cid;
    }
    return null;
  }

  private ensureHost() {
    const cur = this.hostPlayerId ? this.players.get(this.hostPlayerId) : null;
    if (cur) return;
    this.hostPlayerId = this.electHost();
  }

  private isHost(conn: Party.Connection): boolean {
    if (this.hostConns.has(conn.id)) return true;
    const cid = this.connToClient.get(conn.id);
    return !!cid && cid === this.hostPlayerId;
  }
}

// ───── pure helpers ─────
function sanitizeName(raw: string): string {
  return raw.trim().slice(0, 24);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Normalize before comparison: lowercase, trim, strip basic punctuation,
// then strip ALL whitespace. Treating "hot dog" and "hotdog" as the
// same lets the auto-matcher be more generous on spacing without
// inflating Levenshtein costs over the space characters.
function normalizeWord(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()\[\]{}]/g, "")
    .replace(/\s+/g, "");
}

function compareWords(a: string, b: string): boolean {
  const na = normalizeWord(a);
  const nb = normalizeWord(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (Math.abs(na.length - nb.length) > LEV_TOLERANCE) return false;
  return levenshtein(na, nb) <= LEV_TOLERANCE;
}

// Iterative Levenshtein with a single-row rolling buffer.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  const cur = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        cur[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

// Clip incoming drawing to a safe size: max 200 marks, 500 points each
// stroke. Stops a malicious client from blasting megabyte payloads through.
function sanitizeDrawing(d: Drawing | undefined | null): Drawing {
  if (!d || !Array.isArray(d.strokes)) return { strokes: [] };
  const out: Drawing["strokes"] = [];
  for (const s of d.strokes.slice(0, 200)) {
    if (!s || typeof s !== "object") continue;
    const color =
      typeof (s as { color?: unknown }).color === "string"
        ? (s as { color: string }).color.slice(0, 20)
        : "#000";
    // Fill mark — discriminator may be missing on older clients during
    // a rolling deploy; treat anything with x+y but no points as a fill.
    if (
      (s as { kind?: string }).kind === "fill" ||
      (typeof (s as { x?: unknown }).x === "number" &&
        typeof (s as { y?: unknown }).y === "number" &&
        !Array.isArray((s as { points?: unknown }).points))
    ) {
      out.push({
        kind: "fill",
        color,
        x: clamp(Number((s as { x?: unknown }).x) || 0, 0, 1000),
        y: clamp(Number((s as { y?: unknown }).y) || 0, 0, 1000),
      });
      continue;
    }
    out.push({
      kind: "stroke",
      color,
      width:
        typeof (s as { width?: unknown }).width === "number"
          ? clamp((s as { width: number }).width, 0.5, 60)
          : 4,
      erase: !!(s as { erase?: unknown }).erase,
      points: Array.isArray((s as { points?: unknown }).points)
        ? ((s as { points: Array<{ x: number; y: number }> }).points
            .slice(0, 500)
            .map((p) => ({
              x: clamp(Number(p.x) || 0, 0, 1000),
              y: clamp(Number(p.y) || 0, 0, 1000),
            })))
        : [],
    });
  }
  return { strokes: out };
}

PollinartServer satisfies Party.Worker;
