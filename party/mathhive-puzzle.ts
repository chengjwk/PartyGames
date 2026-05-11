// MathHive puzzle generation.
//
// Each round picks a center operator (+ − × ÷) plus 6 outer digits 0-9.
// The center operator is the ONLY operator allowed in submitted equations,
// just like the center letter is the only required letter in WordHive.

export type MathOperator = "+" | "-" | "*" | "/";

export interface MathPuzzle {
  centerOperator: MathOperator;
  outerDigits: string[]; // length 6
  digitSet: Set<string>; // unique digits available
  digitMultiset: Map<string, number>;
}

const DIGITS = "0123456789".split("");
const DIGIT_WEIGHT: Record<string, number> = {
  "0": 4, "1": 8, "2": 8, "3": 8, "4": 7, "5": 7, "6": 6, "7": 5, "8": 5, "9": 4,
};
const OPERATOR_WEIGHT: Record<MathOperator, number> = {
  "+": 4,
  "-": 4,
  "*": 3,
  "/": 1, // division is hard with single digits — keep it rare
};

function weightedPickOperator(): MathOperator {
  const ops = Object.keys(OPERATOR_WEIGHT) as MathOperator[];
  let total = 0;
  for (const o of ops) total += OPERATOR_WEIGHT[o];
  let r = Math.random() * total;
  for (const o of ops) {
    r -= OPERATOR_WEIGHT[o];
    if (r <= 0) return o;
  }
  return "+";
}

// Returns true if there's at least one valid equation of the form
// "a op b = c" or "a op b = cd" (where c is a result built from puzzle digits).
function isSolvable(digits: string[], op: MathOperator): boolean {
  const allowed = new Set(digits);
  for (const a of digits) {
    for (const b of digits) {
      const na = Number(a);
      const nb = Number(b);
      let r: number;
      switch (op) {
        case "+":
          r = na + nb;
          break;
        case "-":
          r = na - nb;
          break;
        case "*":
          r = na * nb;
          break;
        case "/":
          if (nb === 0 || na % nb !== 0) continue;
          r = na / nb;
          break;
      }
      if (r < 0) continue;
      const rs = String(r);
      if ([...rs].every((d) => allowed.has(d))) return true;
    }
  }
  return false;
}

// Weighted-without-replacement: pick from `pool` using DIGIT_WEIGHT.
function weightedDrawFromPool(pool: string[]): string {
  let total = 0;
  for (const d of pool) total += DIGIT_WEIGHT[d];
  let r = Math.random() * total;
  for (const d of pool) {
    r -= DIGIT_WEIGHT[d];
    if (r <= 0) return d;
  }
  return pool[0];
}

export function generateMathPuzzle(): MathPuzzle {
  for (let attempt = 0; attempt < 100; attempt++) {
    const op = weightedPickOperator();
    // Pick 6 UNIQUE digits from 0-9, weighted.
    const pool = [...DIGITS];
    const outerDigits: string[] = [];
    while (outerDigits.length < 6 && pool.length > 0) {
      const d = weightedDrawFromPool(pool);
      outerDigits.push(d);
      pool.splice(pool.indexOf(d), 1);
    }
    if (outerDigits.length < 6) continue;
    if (outerDigits.every((d) => d === "0")) continue;
    if (!isSolvable(outerDigits, op)) continue;
    const digitSet = new Set(outerDigits);
    const multiset = new Map<string, number>();
    for (const d of outerDigits) multiset.set(d, 1);
    return {
      centerOperator: op,
      outerDigits,
      digitSet,
      digitMultiset: multiset,
    };
  }
  // Fallback deterministic puzzle.
  const fallback = ["1", "2", "3", "4", "5", "6"];
  return {
    centerOperator: "+",
    outerDigits: fallback,
    digitSet: new Set(fallback),
    digitMultiset: new Map(fallback.map((d) => [d, 1])),
  };
}
