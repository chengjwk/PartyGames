// MathHive puzzle generation.
//
// Each round picks 7 single digits 0-9 (repeats allowed). Index 0 is the
// "center" digit which must appear in every submitted equation. The picker
// biases toward smaller digits (more interesting) and ensures the puzzle
// has at least one non-zero outer digit so something is constructible.

export interface MathPuzzle {
  digits: string[]; // length 7; index 0 = center
  digitMultiset: Map<string, number>; // count per digit (info only)
  center: string;
}

const DIGITS = "0123456789".split("");
// Weight smaller digits a bit higher than 7/8/9 so puzzles feel more playable.
const DIGIT_WEIGHT: Record<string, number> = {
  "0": 4, "1": 8, "2": 8, "3": 8, "4": 7, "5": 7, "6": 6, "7": 5, "8": 5, "9": 4,
};

function weightedPick(): string {
  let total = 0;
  for (const d of DIGITS) total += DIGIT_WEIGHT[d];
  let r = Math.random() * total;
  for (const d of DIGITS) {
    r -= DIGIT_WEIGHT[d];
    if (r <= 0) return d;
  }
  return "1";
}

export function generateMathPuzzle(): MathPuzzle {
  for (let attempt = 0; attempt < 30; attempt++) {
    const digits: string[] = [];
    for (let i = 0; i < 7; i++) digits.push(weightedPick());
    // Sanity guards: at least one non-zero digit in the outer 6 so we can
    // ever evaluate, and center digit is non-zero (helps every equation be
    // a "real" expression).
    if (digits.slice(1).every((d) => d === "0")) continue;
    if (digits[0] === "0") {
      // Re-roll center as non-zero
      digits[0] = weightedPick();
      if (digits[0] === "0") continue;
    }
    const multiset = new Map<string, number>();
    for (const d of digits) multiset.set(d, (multiset.get(d) ?? 0) + 1);
    return { digits, digitMultiset: multiset, center: digits[0] };
  }
  // Fallback (extremely unlikely): deterministic puzzle
  const fallback = ["2", "3", "4", "5", "1", "6", "7"];
  const ms = new Map<string, number>();
  for (const d of fallback) ms.set(d, (ms.get(d) ?? 0) + 1);
  return { digits: fallback, digitMultiset: ms, center: "2" };
}
