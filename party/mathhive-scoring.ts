// Tokenizer, parser, evaluator, validator, and scorer for MathHive equations.
//
// Grammar (no parens, no unary minus on first token v1):
//   Equation := Expr "=" Expr
//   Expr     := Term ( ("+"|"-") Term )*
//   Term     := Factor ( ("*"|"/") Factor )*
//   Factor   := Number
//
// Tokens accepted from the client are constrained to:
//   - Single-digit chars 0-9 (concatenated to form multi-digit numbers)
//   - Operators: + - * /
//   - "="
//
// Whitespace allowed and ignored.

import type { MathPuzzle } from "./mathhive-puzzle";
import type { MathSubmitReason, ScoredEquation } from "../src/shared/math-types";

const OPERATOR_POINTS: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 3,
  "/": 4,
};
const PANGRAM_BONUS = 20;
const FIRST_FINDER_BONUS = 3;
const EPSILON = 1e-9;

type Token =
  | { kind: "num"; value: number; digits: string[] /* the digit chars used */ }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "eq" };

export type MathValidation =
  | { ok: false; reason: MathSubmitReason }
  | {
      ok: true;
      normalized: string;
      tokens: Token[];
      pangram: boolean;
      operatorsUsed: Array<"+" | "-" | "*" | "/">;
      digitChars: string[]; // every digit character used across the equation
    };

// Tokenize a raw input string. Concatenated digits form multi-digit numbers.
function tokenize(raw: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = raw.replace(/\s+/g, "");
  while (i < s.length) {
    const c = s[i];
    if (c >= "0" && c <= "9") {
      const digits: string[] = [];
      let j = i;
      while (j < s.length && s[j] >= "0" && s[j] <= "9") {
        digits.push(s[j]);
        j++;
      }
      const valueStr = digits.join("");
      // Reject leading zeros on multi-digit numbers (e.g. "012") — confusing.
      if (digits.length > 1 && digits[0] === "0") return null;
      tokens.push({ kind: "num", value: Number(valueStr), digits });
      i = j;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }
    if (c === "=") {
      tokens.push({ kind: "eq" });
      i++;
      continue;
    }
    return null; // illegal character
  }
  return tokens;
}

// Evaluate a flat token list (no `=`) using operator precedence.
// Returns null on syntax error or divide-by-zero (with `divZero` flag).
function evaluate(tokens: Token[]): { value: number; divZero?: boolean } | null {
  if (tokens.length === 0) return null;
  // Expect alternating num, op, num, op, ..., num
  if (tokens[0].kind !== "num") return null;
  for (let i = 1; i < tokens.length; i += 2) {
    if (tokens[i].kind !== "op") return null;
    if (i + 1 >= tokens.length || tokens[i + 1].kind !== "num") return null;
  }

  // First pass: * and /
  const nums: number[] = [(tokens[0] as { value: number }).value];
  const ops: Array<"+" | "-" | "*" | "/"> = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = (tokens[i] as { value: "+" | "-" | "*" | "/" }).value;
    const n = (tokens[i + 1] as { value: number }).value;
    if (op === "*") {
      nums[nums.length - 1] = nums[nums.length - 1] * n;
    } else if (op === "/") {
      if (n === 0) return { value: 0, divZero: true };
      nums[nums.length - 1] = nums[nums.length - 1] / n;
    } else {
      ops.push(op);
      nums.push(n);
    }
  }

  // Second pass: + and -
  let acc = nums[0];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === "+") acc += nums[i + 1];
    else acc -= nums[i + 1];
  }
  return { value: acc };
}

function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export function validateEquation(
  raw: string,
  puzzle: MathPuzzle,
  extraDigits: Set<string>,
): MathValidation {
  const tokens = tokenize(raw);
  if (!tokens || tokens.length === 0) {
    return { ok: false, reason: "invalid_token" };
  }

  // Exactly one `=`
  const eqIdx = tokens.findIndex((t) => t.kind === "eq");
  if (eqIdx === -1) return { ok: false, reason: "no_equals" };
  if (tokens.lastIndexOf(tokens[eqIdx]) !== eqIdx) {
    return { ok: false, reason: "no_equals" };
  }
  // Count any extra `=` by checking each token (lastIndexOf trick above relies
  // on identity — and each token is a fresh object, so it doesn't catch dupes).
  const equalsCount = tokens.filter((t) => t.kind === "eq").length;
  if (equalsCount !== 1) return { ok: false, reason: "no_equals" };

  const left = tokens.slice(0, eqIdx);
  const right = tokens.slice(eqIdx + 1);
  if (left.length === 0 || right.length === 0) {
    return { ok: false, reason: "two_sides" };
  }

  // Every digit used must come from the puzzle's seven digits or extras (bees)
  const allowed = new Set<string>([
    ...puzzle.digits,
    ...Array.from(extraDigits),
  ]);
  const digitChars: string[] = [];
  for (const t of tokens) {
    if (t.kind === "num") {
      for (const d of t.digits) {
        if (!allowed.has(d)) return { ok: false, reason: "invalid_token" };
        digitChars.push(d);
      }
    }
  }

  // Center digit must appear somewhere in the equation
  if (!digitChars.includes(puzzle.center)) {
    return { ok: false, reason: "missing_center" };
  }

  // At least one operator across both sides (no trivial "5 = 5")
  const operatorsUsed: Array<"+" | "-" | "*" | "/"> = [];
  for (const t of tokens) if (t.kind === "op") operatorsUsed.push(t.value);
  if (operatorsUsed.length === 0) return { ok: false, reason: "no_operator" };

  const lv = evaluate(left);
  const rv = evaluate(right);
  if (!lv || !rv) return { ok: false, reason: "invalid_token" };
  if (lv.divZero || rv.divZero) return { ok: false, reason: "div_by_zero" };
  if (!approxEqual(lv.value, rv.value)) return { ok: false, reason: "not_equal" };

  // Pangram: every one of the puzzle's seven digits appears at least once.
  const uniqueDigitsUsed = new Set(digitChars);
  const pangramDigits = puzzle.digits.filter((d) => uniqueDigitsUsed.has(d));
  const pangram = new Set(pangramDigits).size === new Set(puzzle.digits).size;

  return {
    ok: true,
    normalized: tokens
      .map((t) =>
        t.kind === "eq" ? "=" : t.kind === "op" ? t.value : t.digits.join(""),
      )
      .join(""),
    tokens,
    pangram,
    operatorsUsed,
    digitChars,
  };
}

export function scoreEquation(opts: {
  validation: Extract<MathValidation, { ok: true }>;
  firstFinder: boolean;
}): ScoredEquation {
  let points = 0;
  for (const op of opts.validation.operatorsUsed) {
    points += OPERATOR_POINTS[op];
  }
  if (opts.validation.pangram) points += PANGRAM_BONUS;
  if (opts.firstFinder) points += FIRST_FINDER_BONUS;
  return {
    equation: opts.validation.normalized,
    points,
    pangram: opts.validation.pangram,
    firstFinder: opts.firstFinder,
  };
}
