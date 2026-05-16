// "Hive being built" visual for the MathHive round screen.
//
// Each pool-digit a player uses in a successful solve is carried in by
// its OWN worker bee: a bee enters from off-screen with a tiny hex,
// flies to the target slot in the hive, hovers briefly, drops the hex
// (the placed hex pops into existence in the honeycomb), then continues
// off-screen in the opposite direction. A single ambient bee buzzes a
// continuous looping path around the hive so the area never feels dead
// in between solves. Purely cosmetic — gameplay is unaffected.

import { useEffect, useRef, useState } from "react";

interface BuiltHiveProps {
  hexCount: number;
}

// Visual parameters. Sized so the hive is a fat strip across the
// whole bottom of the screen rather than a thin decorative ribbon.
// HEX_R is in SVG units; the SVG scales to fill its CSS box so the
// visible pixel size grows with the device.
const HEX_R = 12;
const HW = HEX_R * Math.sqrt(3);
const ROW_DY = 1.5 * HEX_R;
const HEXES_PER_ROW = 10;
// Height of the hive strip — `min(35vh, 240px)` so on tall phones it
// occupies the bottom third without dominating short landscape screens.
const HIVE_HEIGHT_CSS = "min(35vh, 240px)";
// Each worker bee's full flight (entry → hover → exit) duration.
const WORKER_DURATION_MS = 1500;
// Stagger between workers spawned in the same batch — so a multi-digit
// solve looks like a procession rather than a teleport-in.
const WORKER_STAGGER_MS = 240;

interface WorkerBee {
  id: string;
  hexIndex: number;
  startDelayMs: number;
  entry: { x: number; y: number };
  exit: { x: number; y: number };
}

function hexPosition(index: number): { x: number; y: number } {
  const row = Math.floor(index / HEXES_PER_ROW);
  const col = index % HEXES_PER_ROW;
  const offsetX = (row % 2) * (HW / 2);
  return {
    x: HW * (col + 0.5) + offsetX,
    y: -ROW_DY * row,
  };
}

export default function BuiltHive({ hexCount }: BuiltHiveProps) {
  // Hexes that have been placed in the hive (drop-completed by their bee).
  const [placedSet, setPlacedSet] = useState<Set<number>>(new Set());
  // Bees currently in flight (carrying / placing / departing).
  const [workers, setWorkers] = useState<WorkerBee[]>([]);
  const serialRef = useRef(0);
  const prevHexCountRef = useRef(0);

  const rowsUsed = Math.max(1, Math.ceil(hexCount / HEXES_PER_ROW));
  const totalWidth = HW * (HEXES_PER_ROW + 1);
  const totalHeight = ROW_DY * rowsUsed + HEX_R * 2 + 8;

  // Reset everything when a new game starts (hexCount drops back to 0).
  useEffect(() => {
    if (hexCount === 0 && prevHexCountRef.current > 0) {
      setPlacedSet(new Set());
      setWorkers([]);
    }
    prevHexCountRef.current = hexCount;
  }, [hexCount]);

  // Spawn workers for any pool-digit index that isn't yet placed AND
  // doesn't already have a bee in flight. Indices are sequential, so
  // this typically fires once per solve with N new indices to assign.
  useEffect(() => {
    if (hexCount === 0) return;
    setWorkers((current) => {
      const accountedFor = new Set<number>(placedSet);
      for (const w of current) accountedFor.add(w.hexIndex);
      const needed: number[] = [];
      for (let i = 0; i < hexCount; i++) {
        if (!accountedFor.has(i)) needed.push(i);
      }
      if (needed.length === 0) return current;
      const newWorkers: WorkerBee[] = needed.map((idx, k) => {
        // Alternate entry sides so successive workers don't all stack
        // along the same flight lane.
        const fromLeft = (idx + k) % 2 === 0;
        return {
          id: `w${serialRef.current++}`,
          hexIndex: idx,
          startDelayMs: k * WORKER_STAGGER_MS,
          entry: {
            x: fromLeft ? -22 : totalWidth + 22,
            y: -totalHeight - 6 - Math.random() * 8,
          },
          exit: {
            x: fromLeft ? totalWidth + 30 : -30,
            y: -totalHeight - 4 - Math.random() * 10,
          },
        };
      });
      return [...current, ...newWorkers];
    });
    // We intentionally depend only on hexCount — placedSet/workers are
    // mutated inside this effect via the functional setter, so reacting
    // to their identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexCount]);

  const handlePlace = (hexIndex: number) => {
    setPlacedSet((prev) => {
      if (prev.has(hexIndex)) return prev;
      const next = new Set(prev);
      next.add(hexIndex);
      return next;
    });
  };

  const handleDone = (workerId: string) => {
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
  };

  // Sort placed hexes for stable React keys / draw order.
  const placedIndexes = Array.from(placedSet).sort((a, b) => a - b);

  return (
    <div
      style={{
        height: HIVE_HEIGHT_CSS,
        position: "relative",
        // Break out of the parent main's horizontal padding so the
        // hive fills the entire bottom of the screen edge-to-edge.
        // The parent <main> uses 20px horizontal padding; we offset
        // by the same amount on either side.
        marginLeft: -20,
        marginRight: -20,
        marginTop: 8,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes built-hive-pop {
          0%   { transform: scale(0.25); opacity: 0; }
          70%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes built-hive-wings {
          0%, 100% { transform: scaleY(0.5); }
          50%      { transform: scaleY(1); }
        }
      `}</style>
      <svg
        viewBox={`0 ${-totalHeight + HEX_R} ${totalWidth} ${totalHeight}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMax meet"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Placed hexes — the hive itself */}
        {placedIndexes.map((idx) => {
          const pos = hexPosition(idx);
          return (
            <g
              key={idx}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "built-hive-pop 0.45s ease-out",
              }}
            >
              <polygon
                points={hexPoints(HEX_R)}
                fill="#f5b400"
                fillOpacity={0.8}
                stroke="#3a2a14"
                strokeWidth={0.8}
              />
              <polygon
                points={hexPoints(HEX_R * 0.55)}
                fill="#ffd96a"
                fillOpacity={0.55}
              />
            </g>
          );
        })}

        {/* In-flight worker bees, each carrying their own hex */}
        {workers.map((w) => (
          <WorkerBeeView
            key={w.id}
            worker={w}
            target={hexPosition(w.hexIndex)}
            onPlace={() => handlePlace(w.hexIndex)}
            onDone={() => handleDone(w.id)}
          />
        ))}

        {/* Ambient bee — always present, lazy loop around the hive */}
        <AmbientBee width={totalWidth} height={totalHeight} />

        {/* Empty-state hint */}
        {hexCount === 0 && workers.length === 0 && (
          <text
            x={totalWidth / 2}
            y={-HEX_R - 2}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted)"
            opacity={0.6}
          >
            bees will build a hive from your work…
          </text>
        )}
      </svg>
    </div>
  );
}

// A single worker bee: enters from off-screen carrying a hex, hovers at
// the target position, drops the hex, then flies off in the opposite
// direction. Manages its own animation timeline via requestAnimationFrame
// (instead of CSS keyframes) so each bee can have a unique entry/exit
// pair without generating dynamic CSS rules.
function WorkerBeeView({
  worker,
  target,
  onPlace,
  onDone,
}: {
  worker: WorkerBee;
  target: { x: number; y: number };
  onPlace: () => void;
  onDone: () => void;
}) {
  const [t, setT] = useState(-1); // -1 = not started yet; 0..1 = in flight
  const placedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const startEpoch = performance.now() + worker.startDelayMs;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startEpoch;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / WORKER_DURATION_MS);
      setT(progress);
      // Halfway through the flight (mid-hover) → drop the hex.
      if (progress >= 0.5 && !placedRef.current) {
        placedRef.current = true;
        onPlace();
      }
      if (progress >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.id]);

  if (t < 0) return null;

  // Hover position is just above the target hex.
  const hoverY = target.y - HEX_R - 2;

  // Three flight phases:
  //   0.00 - 0.40 : entry (entry → hover) with eased deceleration
  //   0.40 - 0.55 : hover at target with small bob (drop hex at 0.50)
  //   0.55 - 1.00 : exit (hover → exit) with eased acceleration
  let x: number;
  let y: number;
  if (t < 0.4) {
    const u = t / 0.4;
    const e = easeOutCubic(u);
    x = lerp(worker.entry.x, target.x, e);
    y = lerp(worker.entry.y, hoverY, e);
  } else if (t < 0.55) {
    const u = (t - 0.4) / 0.15;
    const bob = Math.sin(u * Math.PI) * 2;
    x = target.x;
    y = hoverY - bob;
  } else {
    const u = (t - 0.55) / 0.45;
    const e = easeInCubic(u);
    x = lerp(target.x, worker.exit.x, e);
    y = lerp(hoverY, worker.exit.y, e);
  }

  const carrying = t < 0.5;
  const facingRight = worker.exit.x > worker.entry.x;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ pointerEvents: "none" }}
    >
      {carrying && (
        <g transform={`translate(0, ${HEX_R + 1})`}>
          <polygon
            points={hexPoints(HEX_R * 0.85)}
            fill="#f5b400"
            fillOpacity={0.85}
            stroke="#3a2a14"
            strokeWidth={0.6}
          />
        </g>
      )}
      <BeeBody flip={!facingRight} />
    </g>
  );
}

// Always-on bee that wanders a slow loop above the hive between solves.
// Uses a Lissajous-style path (sin/cos with different frequencies) so the
// trajectory doesn't look like a perfect circle.
function AmbientBee({ width, height }: { width: number; height: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      setPhase(((now - start) / 7800) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Path centered horizontally, hovering just above the hive top.
  const centerX = width / 2;
  const centerY = -height + HEX_R * 3.5;
  const rx = width * 0.4;
  const ry = HEX_R * 2.2;
  const a = phase * Math.PI * 2;
  const x = centerX + Math.sin(a) * rx;
  const y = centerY + Math.cos(a * 2) * ry;
  // Heading direction (right when moving rightward — derivative of x).
  const facingRight = Math.cos(a) > 0;

  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      <BeeBody flip={!facingRight} />
    </g>
  );
}

function BeeBody({ flip = false }: { flip?: boolean }) {
  return (
    <g transform={flip ? "scale(-1, 1)" : undefined}>
      {/* Wings (flapping) */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "built-hive-wings 0.12s linear infinite",
        }}
      >
        <ellipse cx={-2} cy={-3.2} rx={2.8} ry={1.5} fill="#ffffff" opacity={0.75} />
        <ellipse cx={2} cy={-3.2} rx={2.8} ry={1.5} fill="#ffffff" opacity={0.75} />
      </g>
      {/* Body */}
      <ellipse cx={0} cy={0} rx={4} ry={2.8} fill="#f5d040" stroke="#3a2a14" strokeWidth={0.5} />
      {/* Stripes */}
      <rect x={-2.6} y={-2} width={1.3} height={4} fill="#3a2a14" />
      <rect x={0} y={-2} width={1.3} height={4} fill="#3a2a14" />
      {/* Eye dot */}
      <circle cx={-3} cy={-0.4} r={0.5} fill="#1a1a1f" />
    </g>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function hexPoints(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}
