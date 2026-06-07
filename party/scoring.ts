import type { ScoredWord, SubmitReason } from "../src/shared/types";
import type { Puzzle } from "./puzzle";
import { isInDictionary } from "./puzzle";

// Standard Scrabble letter values. Encodes letter rarity directly into the
// per-word score; replaces the old `length + rare-letter bonus` scheme.
const LETTER_VALUES: Record<string, number> = {
  a: 1, e: 1, i: 1, o: 1, u: 1, l: 1, n: 1, r: 1, s: 1, t: 1,
  d: 2, g: 2,
  b: 3, c: 3, m: 3, p: 3,
  f: 4, h: 4, v: 4, w: 4, y: 4,
  k: 5,
  j: 8, x: 8,
  q: 10, z: 10,
};

const PANGRAM_BONUS = 20;
const FIRST_FINDER_BONUS = 3;
// Each pangram beyond the first this round (per player) tacks on this much
// on top of the base +20. So pangram #2, #3, #4… are all worth the same
// extra — keeps a one-off lucky find from dominating the score, but still
// rewards players who keep digging.
const EXTRA_PANGRAM_BONUS = 30;
// "Super pangram" = uses all 7 puzzle letters AND at least one bee letter.
// Substantially rarer than a regular pangram, so the prize is bigger.
const SUPER_PANGRAM_BONUS = 40;

export type ValidationResult =
  | { ok: false; reason: SubmitReason }
  | {
      ok: true;
      word: string;
      isPangram: boolean;
    };

// `extraLetters` are letters added to the playable set beyond the puzzle's 7
// (e.g. the active bee letter, or a recently-departed bee within its grace
// period). Pangrams still require all 7 puzzle letters.
export function validateWord(
  rawWord: string,
  puzzle: Puzzle,
  extraLetters: Set<string>,
  centerOverride?: string,
): ValidationResult {
  const word = rawWord.toLowerCase().trim();
  // In swarm mode, the queen bee replaces the center letter requirement.
  const center = centerOverride ?? puzzle.center;

  if (word.length < 3) return { ok: false, reason: "too_short" };
  if (!word.includes(center)) return { ok: false, reason: "missing_center" };

  let usedExtra = false;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (puzzle.letterSet.has(ch)) continue;
    if (extraLetters.has(ch)) {
      usedExtra = true;
      continue;
    }
    return { ok: false, reason: "invalid_letter" };
  }

  // The puzzle's precomputed validWords is the seven-letter set only — when
  // an extra letter shows up we widen the dictionary check to the full word
  // list so words like "fudge" become valid if F is the bee letter.
  if (usedExtra) {
    if (!isInDictionary(word)) return { ok: false, reason: "not_a_word" };
  } else {
    if (!puzzle.validWords.has(word)) return { ok: false, reason: "not_a_word" };
  }

  const wordLetters = new Set(word);
  let pangramCount = 0;
  for (const l of puzzle.letterSet) if (wordLetters.has(l)) pangramCount++;
  const isPangram = pangramCount === puzzle.letterSet.size;

  return { ok: true, word, isPangram };
}

// Base score = sum of Scrabble values for each letter.
// + 20 for the first pangram of a round (per player)
// + 30 for each pangram beyond the first (per player, per round)
// + 40 if the pangram is a "super pangram" (uses all 7 + a bee letter)
// + 3 for first finder of this word in this round
// (Bonus-letter 2x and player handicap multipliers apply outside this fn.)
export function scoreWord(opts: {
  word: string;
  isPangram: boolean;
  firstFinder: boolean;
  // Number of pangrams this player has already found this round, BEFORE
  // counting the current word. Used to compute the per-pangram ordinal and
  // pick between the base and extra pangram bonuses.
  priorPangramsThisRound?: number;
  // True iff the current word is a pangram that also includes at least one
  // bee letter (current or in grace). Server decides this; we just apply
  // the bonus when set.
  superPangram?: boolean;
}): ScoredWord {
  let points = 0;
  for (const ch of opts.word) {
    points += LETTER_VALUES[ch] ?? 1;
  }
  let pangramOrdinal: number | undefined;
  if (opts.isPangram) {
    const prior = opts.priorPangramsThisRound ?? 0;
    pangramOrdinal = prior + 1;
    // 1st pangram → +20. 2nd+ → +20 + 30 = +50 each (cap-at-2nd intent).
    points += prior === 0 ? PANGRAM_BONUS : PANGRAM_BONUS + EXTRA_PANGRAM_BONUS;
    if (opts.superPangram) points += SUPER_PANGRAM_BONUS;
  }
  if (opts.firstFinder) points += FIRST_FINDER_BONUS;
  return {
    word: opts.word,
    points,
    isPangram: opts.isPangram,
    firstFinder: opts.firstFinder,
    superPangram: opts.superPangram || undefined,
    pangramOrdinal,
  };
}
