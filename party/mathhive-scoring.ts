// MathHive scoring + solve verification (v2).
//
// Solve verification simulates the player's step list against the pool:
// each step combines two "alive" tiles into a new one, consuming the
// sources. The final step's result must equal the target. We also compute
// which pool positions the final tile consumed — the all-six bonus only
// triggers when every original digit ended up in the path.

import type {
  MathOperandRef,
  MathOperator,
  MathSolveReason,
  MathSolveStep,
} from "../src/shared/math-types";
import {
  ALL_SIX_BONUS,
  TARGET_FLOOR_POINTS,
} from "./mathhive-puzzle";

export interface SolveVerdictOk {
  ok: true;
  finalValue: number;
  positionsMask: number; // bitmask of pool slots used by the winning tile
  allSix: boolean;
  stepsUsed: number;
}

export interface SolveVerdictFail {
  ok: false;
  reason: MathSolveReason;
}

export type SolveVerdict = SolveVerdictOk | SolveVerdictFail;

const FULL_MASK_6 = (1 << 6) - 1;

export function verifySolve(args: {
  poolDigits: string[];
  allowedOperators: MathOperator[];
  steps: MathSolveStep[];
  target: number;
}): SolveVerdict {
  const { poolDigits, steps, target } = args;
  if (steps.length === 0) return { ok: false, reason: "invalid_steps" };
  if (poolDigits.length !== 6) return { ok: false, reason: "invalid_steps" };

  const allowed = new Set(args.allowedOperators);

  type Tile = { value: number; mask: number; alive: boolean };
  const tiles: Tile[] = poolDigits.map((d, i) => ({
    value: Number(d),
    mask: 1 << i,
    alive: true,
  }));
  const stepResults: Tile[] = [];

  const resolve = (ref: MathOperandRef, currentStepIdx: number): Tile | null => {
    if (ref.source === "pool") {
      if (!Number.isInteger(ref.index) || ref.index < 0 || ref.index >= 6) return null;
      return tiles[ref.index];
    }
    if (ref.source === "step") {
      if (!Number.isInteger(ref.index) || ref.index < 0 || ref.index >= currentStepIdx) return null;
      return stepResults[ref.index];
    }
    return null;
  };

  for (let si = 0; si < steps.length; si++) {
    const step = steps[si];
    if (!step || typeof step.operator !== "string" || !allowed.has(step.operator)) {
      return { ok: false, reason: "disallowed_operator" };
    }
    const lTile = resolve(step.left, si);
    const rTile = resolve(step.right, si);
    if (!lTile || !rTile) return { ok: false, reason: "invalid_steps" };
    if (lTile === rTile) return { ok: false, reason: "invalid_steps" };
    if (!lTile.alive || !rTile.alive) return { ok: false, reason: "invalid_steps" };
    // Sanity: tiles should never share pool positions if alive accounting
    // is correct, but defense-in-depth never hurts.
    if ((lTile.mask & rTile.mask) !== 0) return { ok: false, reason: "invalid_steps" };

    let v: number;
    switch (step.operator) {
      case "+":
        v = lTile.value + rTile.value;
        break;
      case "-":
        v = lTile.value - rTile.value;
        break;
      case "*":
        v = lTile.value * rTile.value;
        break;
      case "/":
        if (rTile.value === 0) return { ok: false, reason: "div_by_zero" };
        if (lTile.value % rTile.value !== 0) return { ok: false, reason: "div_non_integer" };
        v = lTile.value / rTile.value;
        break;
    }
    if (!Number.isFinite(v)) return { ok: false, reason: "invalid_steps" };

    lTile.alive = false;
    rTile.alive = false;
    const newTile: Tile = { value: v, mask: lTile.mask | rTile.mask, alive: true };
    stepResults.push(newTile);
  }

  const finalTile = stepResults[stepResults.length - 1];
  if (finalTile.value !== target) {
    return { ok: false, reason: "value_mismatch" };
  }

  return {
    ok: true,
    finalValue: finalTile.value,
    positionsMask: finalTile.mask,
    allSix: finalTile.mask === FULL_MASK_6,
    stepsUsed: steps.length,
  };
}

// Time-decay scoring: starts at basePoints, decays linearly to floor over
// timeBudgetMs, plus the all-six bonus if applicable. Never negative
// (floor enforces ≥1pt for any valid solve).
export function scoreSolve(args: {
  basePoints: number;
  floorPoints?: number;
  timeBudgetMs: number;
  solveMs: number;
  allSix: boolean;
}): number {
  const floor = args.floorPoints ?? TARGET_FLOOR_POINTS;
  const ratio = Math.max(0, Math.min(1, args.solveMs / args.timeBudgetMs));
  const decayed = args.basePoints - (args.basePoints - floor) * ratio;
  let pts = Math.max(floor, Math.round(decayed));
  if (args.allSix) pts += ALL_SIX_BONUS;
  return pts;
}
