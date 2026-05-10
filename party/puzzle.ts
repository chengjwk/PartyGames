import wordsRaw from "./data/words.json";
import pangramsRaw from "./data/pangrams.json";

const ALL_WORDS: ReadonlyArray<string> = wordsRaw as string[];
const PANGRAM_SEEDS: ReadonlyArray<string> = pangramsRaw as string[];

const WORD_SET: ReadonlySet<string> = new Set(ALL_WORDS);

export interface Puzzle {
  letters: string[]; // [center, ...6 outer]
  letterSet: Set<string>;
  center: string;
  validWords: Set<string>;
  pangrams: string[];
  bonusLetter: string; // outer letter scoring 2x
  seedWord: string; // the pangram used as the seed (for repeat avoidance)
}

// Find every dictionary word that could be played given a set of 7 letters
// and a required center letter. A word is playable if every letter is in the
// puzzle set and the word contains the center letter at least once.
function findValidWords(letterSet: Set<string>, center: string): string[] {
  const valid: string[] = [];
  for (const w of ALL_WORDS) {
    if (w.length < 3) continue;
    if (!w.includes(center)) continue;
    let ok = true;
    for (let i = 0; i < w.length; i++) {
      if (!letterSet.has(w[i])) {
        ok = false;
        break;
      }
    }
    if (ok) valid.push(w);
  }
  return valid;
}

// Pick a puzzle that yields a healthy word count (not too thin, not absurd).
const MIN_WORDS = 30;
const MAX_WORDS = 200;

// Weighted preference for center letter — common letters yield denser puzzles.
// Q/J/Z/X/V get 0 weight so they're never the center; the center is the
// required letter and a rare-letter center kills word counts.
const CENTER_WEIGHT: Record<string, number> = {
  a: 10, e: 10, i: 9, o: 9, r: 10, s: 10, t: 10, n: 9, l: 8,
  d: 7, c: 7, m: 6, p: 6, b: 5, g: 5, h: 5, u: 5, f: 4, y: 3,
  k: 2, w: 2,
  v: 0, j: 0, q: 0, z: 0, x: 0,
};

function pickWeightedCenter(letters: string[]): string {
  let total = 0;
  for (const l of letters) total += CENTER_WEIGHT[l] ?? 1;
  if (total === 0) return letters[Math.floor(Math.random() * letters.length)];
  let r = Math.random() * total;
  for (const l of letters) {
    r -= CENTER_WEIGHT[l] ?? 1;
    if (r <= 0) return l;
  }
  return letters[letters.length - 1];
}

export function generatePuzzle(
  opts: { exclude?: ReadonlySet<string>; attempts?: number } = {},
): Puzzle {
  const attempts = opts.attempts ?? 80;
  const exclude = opts.exclude ?? new Set<string>();
  for (let i = 0; i < attempts; i++) {
    const seed = PANGRAM_SEEDS[Math.floor(Math.random() * PANGRAM_SEEDS.length)];
    if (exclude.has(seed)) continue;
    const letters = [...new Set(seed)]; // 7 unique chars
    const center = pickWeightedCenter(letters);
    const letterSet = new Set(letters);
    const validList = findValidWords(letterSet, center);
    if (validList.length < MIN_WORDS || validList.length > MAX_WORDS) continue;

    const validWords = new Set(validList);
    const pangrams = validList.filter((w) => new Set(w).size === 7);
    if (pangrams.length === 0) continue; // shouldn't happen since seed is a pangram, but defensive

    // Place center first, shuffle the other 6 for display
    const outer = letters.filter((l) => l !== center);
    shuffleInPlace(outer);
    const bonusLetter = outer[Math.floor(Math.random() * outer.length)];
    return {
      letters: [center, ...outer],
      letterSet,
      center,
      validWords,
      pangrams,
      bonusLetter,
      seedWord: seed,
    };
  }
  // Fallback: relax both the word-count filter and (last) the exclude set.
  // Tries unexcluded seeds first; if still nothing, accepts any seed.
  const fallbackSeed = (() => {
    for (let k = 0; k < 50; k++) {
      const s = PANGRAM_SEEDS[Math.floor(Math.random() * PANGRAM_SEEDS.length)];
      if (!exclude.has(s)) return s;
    }
    return PANGRAM_SEEDS[Math.floor(Math.random() * PANGRAM_SEEDS.length)];
  })();
  const letters = [...new Set(fallbackSeed)];
  const center = pickWeightedCenter(letters);
  const letterSet = new Set(letters);
  const validList = findValidWords(letterSet, center);
  const outer = letters.filter((l) => l !== center);
  shuffleInPlace(outer);
  const bonusLetter = outer[Math.floor(Math.random() * outer.length)];
  return {
    letters: [center, ...outer],
    letterSet,
    center,
    validWords: new Set(validList),
    pangrams: validList.filter((w) => new Set(w).size === 7),
    bonusLetter,
    seedWord: fallbackSeed,
  };
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Lookup helper — used outside puzzle generation.
export function isInDictionary(word: string): boolean {
  return WORD_SET.has(word);
}
