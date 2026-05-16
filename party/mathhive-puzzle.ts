// MathHive puzzle generation (v2).
//
// A round picks a pool of 6 UNIQUE digits drawn from 1-9 plus an operator
// set determined by difficulty. Then we enumerate all integer values the
// pool can reach via binary-op trees that consume a disjoint subset of the
// pool. The server uses this reachable map to (a) hand each player a stream
// of solvable targets, and (b) verify their submitted solution steps.
//
// Why precompute? 6 unique digits = 64 position subsets; the reachable set
// per pool is bounded (we cap intermediate magnitudes), so enumeration runs
// in well under 100ms. Doing it once per round beats validating each solve
// against a fresh search.

import type { MathDifficulty, MathOperator } from "../src/shared/math-types";

export interface ReachableEntry {
  minOps: number; // smallest # of binary ops in any tree that reaches this value
  // True iff there's a tree that uses ALL 6 pool digits and lands on this
  // value. Drives the "all-six bonus" eligibility hint.
  allSixOk: boolean;
}

export interface MathPuzzle {
  digits: string[]; // length 6, unique, drawn from "1".."9"
  operators: MathOperator[];
  // value → reachability info. Keys are integer values the pool can reach.
  reachable: Map<number, ReachableEntry>;
}

const POOL_SIZE = 6;
// Cap intermediate magnitudes so multiplication doesn't explode the state
// space. Values outside this window are pruned during enumeration.
const VALUE_MIN = -200;
const VALUE_MAX = 1000;

const DIGIT_WEIGHT: Record<string, number> = {
  "1": 7, "2": 8, "3": 8, "4": 7, "5": 7, "6": 6, "7": 5, "8": 5, "9": 4,
};

export function operatorsForDifficulty(d: MathDifficulty): MathOperator[] {
  switch (d) {
    case "easy":
      return ["+", "-"];
    case "medium":
    case "hard":
      return ["+", "-", "*", "/"];
  }
}

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

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>>= 1;
  }
  return c;
}

// Enumerate every value reachable by some binary-op tree consuming a subset
// of the pool. Returns:
//   states[bitmask] = Map<value, minOpsToReachWithThisExactSubset>
// where bitmask indicates which pool positions the tree consumed.
//
// For 6 unique digits this finishes in well under 100ms with the magnitude
// cap. The output is large enough (low thousands of entries) for sampling
// to feel varied across rounds.
function enumerateStates(
  digits: number[],
  ops: MathOperator[],
): Map<number, Map<number, number>> {
  const n = digits.length;
  const fullMask = (1 << n) - 1;
  const states = new Map<number, Map<number, number>>();
  for (let i = 0; i < n; i++) {
    const mask = 1 << i;
    states.set(mask, new Map([[digits[i], 0]]));
  }

  for (let size = 2; size <= n; size++) {
    for (let S = 1; S <= fullMask; S++) {
      if (popcount(S) !== size) continue;
      const sValues = new Map<number, number>();
      // Iterate strict subsets A of S with A < B (canonical) so we don't
      // count each (A, B) split twice. Non-commutative orderings are
      // handled inside the op switch.
      for (let A = (S - 1) & S; A > 0; A = (A - 1) & S) {
        const B = S & ~A;
        if (A >= B) continue;
        const va = states.get(A);
        const vb = states.get(B);
        if (!va || !vb) continue;
        for (const valA of va.keys()) {
          for (const valB of vb.keys()) {
            for (const op of ops) {
              const candidates: number[] = [];
              switch (op) {
                case "+":
                  candidates.push(valA + valB);
                  break;
                case "-":
                  // Commutative-with-swap: only |a-b| is reachable
                  // (the verifier swaps to keep results ≥ 0).
                  candidates.push(Math.abs(valA - valB));
                  break;
                case "*":
                  candidates.push(valA * valB);
                  break;
                case "/": {
                  // big/small only — same commutative-with-swap rule.
                  const big = Math.max(valA, valB);
                  const small = Math.min(valA, valB);
                  if (small !== 0 && big % small === 0)
                    candidates.push(big / small);
                  break;
                }
              }
              const minOps = size - 1;
              for (const r of candidates) {
                if (!Number.isFinite(r)) continue;
                if (r < VALUE_MIN || r > VALUE_MAX) continue;
                if (!Number.isInteger(r)) continue;
                const prior = sValues.get(r);
                if (prior === undefined || prior > minOps) {
                  sValues.set(r, minOps);
                }
              }
            }
          }
        }
      }
      states.set(S, sValues);
    }
  }
  return states;
}

function aggregateReachable(
  states: Map<number, Map<number, number>>,
  fullMask: number,
): Map<number, ReachableEntry> {
  const out = new Map<number, ReachableEntry>();
  for (const [S, vals] of states) {
    const isFull = S === fullMask;
    for (const [v, ops] of vals) {
      const existing = out.get(v);
      if (!existing) {
        out.set(v, { minOps: ops, allSixOk: isFull });
      } else {
        if (ops < existing.minOps) existing.minOps = ops;
        if (isFull) existing.allSixOk = true;
      }
    }
  }
  return out;
}

// Build a set of puzzles that share the same 6-digit pool but differ
// in operator sets per difficulty. Used when a single round has
// players on mixed difficulties — we want every player's reachable
// candidates to be authentic to their own allowed operators, but
// the visible pool of digits is shared.
export function generateMathPuzzleSet(
  difficulties: MathDifficulty[],
): { digits: string[]; perDifficulty: Map<MathDifficulty, MathPuzzle> } {
  const uniq = new Set<MathDifficulty>(
    difficulties.length > 0 ? difficulties : ["easy"],
  );
  // Always sanity-check against the broadest operator set in use so
  // we don't pick a pool that's only easy-friendly when there are
  // medium/hard players present.
  const hasBroad = uniq.has("medium") || uniq.has("hard");
  const sanityOps = hasBroad
    ? operatorsForDifficulty("medium")
    : operatorsForDifficulty("easy");
  const allDigits = "123456789".split("");
  for (let attempt = 0; attempt < 20; attempt++) {
    const pool = [...allDigits];
    const digits: string[] = [];
    while (digits.length < POOL_SIZE && pool.length > 0) {
      const d = weightedDrawFromPool(pool);
      digits.push(d);
      pool.splice(pool.indexOf(d), 1);
    }
    if (digits.length < POOL_SIZE) continue;
    const dn = digits.map((d) => Number(d));
    // Quick sanity check using the broadest ops.
    const sStates = enumerateStates(dn, sanityOps);
    const sReach = aggregateReachable(sStates, (1 << POOL_SIZE) - 1);
    let goodCount = 0;
    for (const [v, info] of sReach) {
      if (v >= 10 && v <= 100 && info.minOps >= 2) goodCount++;
    }
    if (goodCount < 10) continue;
    // Pool is good — build a puzzle per requested difficulty.
    const perDifficulty = new Map<MathDifficulty, MathPuzzle>();
    for (const diff of uniq) {
      const ops = operatorsForDifficulty(diff);
      const states = enumerateStates(dn, ops);
      const reachable = aggregateReachable(states, (1 << POOL_SIZE) - 1);
      perDifficulty.set(diff, { digits, operators: ops, reachable });
    }
    return { digits, perDifficulty };
  }
  // Fallback — deterministic pool to avoid hangs on pathological RNG.
  const digits = ["1", "2", "3", "4", "5", "6"];
  const dn = digits.map(Number);
  const perDifficulty = new Map<MathDifficulty, MathPuzzle>();
  for (const diff of uniq) {
    const ops = operatorsForDifficulty(diff);
    const states = enumerateStates(dn, ops);
    perDifficulty.set(diff, {
      digits,
      operators: ops,
      reachable: aggregateReachable(states, (1 << POOL_SIZE) - 1),
    });
  }
  return { digits, perDifficulty };
}

export function generateMathPuzzle(difficulty: MathDifficulty): MathPuzzle {
  const ops = operatorsForDifficulty(difficulty);
  const allDigits = "123456789".split("");
  for (let attempt = 0; attempt < 20; attempt++) {
    const pool = [...allDigits];
    const digits: string[] = [];
    while (digits.length < POOL_SIZE && pool.length > 0) {
      const d = weightedDrawFromPool(pool);
      digits.push(d);
      pool.splice(pool.indexOf(d), 1);
    }
    if (digits.length < POOL_SIZE) continue;
    const states = enumerateStates(
      digits.map((d) => Number(d)),
      ops,
    );
    const reachable = aggregateReachable(states, (1 << POOL_SIZE) - 1);
    // Sanity check: require enough good targets (positive integers ≥ 10,
    // reached with 2+ ops). Otherwise the pool is too thin — reroll.
    let goodCount = 0;
    for (const [v, info] of reachable) {
      if (v >= 10 && v <= 100 && info.minOps >= 2) goodCount++;
    }
    if (goodCount < 10) continue;
    return { digits, operators: ops, reachable };
  }
  // Fallback — deterministic puzzle to avoid hangs if RNG is pathological.
  const digits = ["1", "2", "3", "4", "5", "6"];
  const states = enumerateStates(
    digits.map((d) => Number(d)),
    ops,
  );
  return {
    digits,
    operators: ops,
    reachable: aggregateReachable(states, (1 << POOL_SIZE) - 1),
  };
}

// Per-minOps time budget + base points + floor. The "budget" is how long
// until the score decays to the floor; players still finish past the
// budget, they just don't earn more for going faster.
//
// Base points grow super-linearly with digits used (1 op = 2 digits,
// 5 ops = 6 digits). The deltas are 6/8/10/12 so each additional digit
// brings a bigger per-digit reward than the last — strongly incentivizes
// chaining through more of the pool. The all-six bonus piles +15 more
// on top, so a fully-chained 5-op solve maxes at 55 pts vs. 4 pts for
// the easiest single-op solve.
export const TARGET_TIME_BUDGET_MS: Record<number, number> = {
  1: 5_000,
  2: 8_000,
  3: 12_000,
  4: 16_000,
  5: 22_000,
};
export const TARGET_BASE_POINTS: Record<number, number> = {
  1: 4,
  2: 10,
  3: 18,
  4: 28,
  5: 40,
};
export const TARGET_FLOOR_POINTS = 1;
export const ALL_SIX_BONUS = 15;
export const SKIP_PENALTY = -1;

// Build a sampled "slot" of valid target values for a pool. We want a mix
// of difficulties so a round feels varied. Returns an array of values; the
// server then assigns IDs and serves them one-at-a-time to players,
// recycling once exhausted.
export function buildTargetCandidates(puzzle: MathPuzzle): number[] {
  const buckets: { easy: number[]; medium: number[]; hard: number[] } = {
    easy: [],
    medium: [],
    hard: [],
  };
  const poolSet = new Set(puzzle.digits.map((d) => Number(d)));
  for (const [v, info] of puzzle.reachable) {
    if (v < 1) continue; // positive targets only for v1
    if (v > 100) continue; // user constraint: targets 1-100 in easy/medium
    // Skip values trivially on the pool (e.g., "make 5" when 5 is a tile).
    if (info.minOps === 0 && poolSet.has(v)) continue;
    if (info.minOps <= 1) buckets.easy.push(v);
    else if (info.minOps <= 3) buckets.medium.push(v);
    else buckets.hard.push(v);
  }
  // 25% easy / 55% medium / 20% hard, with sampling-with-replacement so a
  // single tasty value can recur but back-to-back duplication is avoided
  // by the server when issuing.
  const out: number[] = [];
  const sample = (arr: number[], count: number) => {
    if (arr.length === 0) return;
    for (let i = 0; i < count; i++) {
      out.push(arr[Math.floor(Math.random() * arr.length)]);
    }
  };
  sample(buckets.easy, 25);
  sample(buckets.medium, 55);
  sample(buckets.hard, 20);
  // Shuffle so buckets aren't clustered
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
