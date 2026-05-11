// Tokenizer, parser, evaluator, validator, and scorer for MathHive equations.
//
// Only the puzzle's center operator is permitted in any submitted equation.
// Operator precedence is meaningless when only one operator is in use, so
// evaluation is strictly left-to-right.

import type { MathPuzzle, MathOperator } from "./mathhive-puzzle";
import type { MathSubmitReason, ScoredEquation } from "../src/shared/math-types";

const OPERATOR_POINTS: Record<MathOperator, number> = {
  "+": 1,
  "-": 1,
  "*": 3,
  "/": 4,
};
const PANGRAM_BONUS = 20;
const FIRST_FINDER_BONUS = 3;
const EPSILON = 1e-9;

type Token =
  | { kind: "num"; value: number; digits: string[] }
  | { kind: "op"; value: MathOperator }
  | { kind: "eq" };

export type MathValidation =
  | { ok: false; reason: MathSubmitReason }
  | {
      ok: true;
      normalized: string;
      tokens: Token[];
      pangram: boolean;
      operatorCount: number;
      digitChars: string[];
    };

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
      if (digits.length > 1 && digits[0] === "0") return null;
      tokens.push({ kind: "num", value: Number(digits.join("")), digits });
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
    return null;
  }
  return tokens;
}

// Left-to-right evaluation (no precedence needed since there's only one op).
function evaluate(tokens: Token[]): { value: number; divZero?: boolean } | null {
  if (tokens.length === 0) return null;
  if (tokens[0].kind !== "num") return null;
  for (let i = 1; i < tokens.length; i += 2) {
    if (tokens[i].kind !== "op") return null;
    if (i + 1 >= tokens.length || tokens[i + 1].kind !== "num") return null;
  }
  let acc = (tokens[0] as { value: number }).value;
  for (let i = 1; i < tokens.length; i += 2) {
    const op = (tokens[i] as { value: MathOperator }).value;
    const n = (tokens[i + 1] as { value: number }).value;
    switch (op) {
      case "+": acc += n; break;
      case "-": acc -= n; break;
      case "*": acc *= n; break;
      case "/":
        if (n === 0) return { value: 0, divZero: true };
        acc /= n;
        break;
    }
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
  if (!tokens || tokens.length === 0) return { ok: false, reason: "invalid_token" };

  const equalsCount = tokens.filter((t) => t.kind === "eq").length;
  if (equalsCount !== 1) return { ok: false, reason: "no_equals" };

  const eqIdx = tokens.findIndex((t) => t.kind === "eq");
  const left = tokens.slice(0, eqIdx);
  const right = tokens.slice(eqIdx + 1);
  if (left.length === 0 || right.length === 0) {
    return { ok: false, reason: "two_sides" };
  }

  // Every operator must be the puzzle's center operator.
  let operatorCount = 0;
  for (const t of tokens) {
    if (t.kind === "op") {
      if (t.value !== puzzle.centerOperator) {
        return { ok: false, reason: "invalid_token" };
      }
      operatorCount++;
    }
  }
  if (operatorCount === 0) return { ok: false, reason: "no_operator" };

  // Every digit must come from puzzle outer digits (or a bee's extras).
  const allowed = new Set<string>([
    ...puzzle.digitSet,
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

  const lv = evaluate(left);
  const rv = evaluate(right);
  if (!lv || !rv) return { ok: false, reason: "invalid_token" };
  if (lv.divZero || rv.divZero) return { ok: false, reason: "div_by_zero" };
  if (!approxEqual(lv.value, rv.value)) return { ok: false, reason: "not_equal" };

  // Pangram: every one of the puzzle's outer digits used at least once.
  const uniqueDigitsUsed = new Set(digitChars);
  const pangram = [...puzzle.digitSet].every((d) => uniqueDigitsUsed.has(d));

  return {
    ok: true,
    normalized: tokens
      .map((t) =>
        t.kind === "eq" ? "=" : t.kind === "op" ? t.value : t.digits.join(""),
      )
      .join(""),
    tokens,
    pangram,
    operatorCount,
    digitChars,
  };
}

export function scoreEquation(opts: {
  validation: Extract<MathValidation, { ok: true }>;
  puzzle: MathPuzzle;
  firstFinder: boolean;
}): ScoredEquation {
  let points = OPERATOR_POINTS[opts.puzzle.centerOperator] * opts.validation.operatorCount;
  if (opts.validation.pangram) points += PANGRAM_BONUS;
  if (opts.firstFinder) points += FIRST_FINDER_BONUS;
  return {
    equation: opts.validation.normalized,
    points,
    pangram: opts.validation.pangram,
    firstFinder: opts.firstFinder,
  };
}
