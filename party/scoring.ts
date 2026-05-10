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
): ValidationResult {
  const word = rawWord.toLowerCase().trim();

  if (word.length < 3) return { ok: false, reason: "too_short" };
  if (!word.includes(puzzle.center)) return { ok: false, reason: "missing_center" };

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
// + 20 for pangrams (uses all 7 puzzle letters)
// + 3 for first finder of this word in this round
// (Bonus-letter 2x and player handicap multipliers apply outside this fn.)
export function scoreWord(opts: {
  word: string;
  isPangram: boolean;
  firstFinder: boolean;
}): ScoredWord {
  let points = 0;
  for (const ch of opts.word) {
    points += LETTER_VALUES[ch] ?? 1;
  }
  if (opts.isPangram) points += PANGRAM_BONUS;
  if (opts.firstFinder) points += FIRST_FINDER_BONUS;
  return {
    word: opts.word,
    points,
    isPangram: opts.isPangram,
    firstFinder: opts.firstFinder,
  };
}
