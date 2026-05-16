// Subtle "hive being built" visual for the MathHive round screen.
//
// Every time the player solves a target, N pool digits were used in that
// solve's lineage. Those N "hexes" are deposited into the hive: a small
// honeycomb that grows row by row as the round progresses. A tiny bee
// buzzes lazily across the structure for ambient life. Purely cosmetic —
// gameplay is unaffected.

import { useEffect, useRef, useState } from "react";

interface BuiltHiveProps {
  // Total pool-digit count contributed so far in the round.
  hexCount: number;
}

// Visual parameters — tuned for a compact ribbon along the bottom of
// the screen so it doesn't compete with the pool/operator zone.
const HEX_R = 6;
const HW = HEX_R * Math.sqrt(3); // ~10.4
const ROW_DY = 1.5 * HEX_R; // ~9
const HEXES_PER_ROW = 18;
const VIEW_HEIGHT = 60;

export default function BuiltHive({ hexCount }: BuiltHiveProps) {
  // Track which hex indexes are "fresh" (just landed) so we can animate
  // them popping in. Comparing previous vs current count gives us the
  // range to mark as fresh.
  const prevCountRef = useRef(0);
  const [freshUntil, setFreshUntil] = useState<Record<number, number>>({});

  useEffect(() => {
    if (hexCount <= prevCountRef.current) {
      prevCountRef.current = hexCount;
      return;
    }
    const now = Date.now();
    const additions: Record<number, number> = {};
    for (let i = prevCountRef.current; i < hexCount; i++) {
      // Stagger arrivals slightly so a multi-digit solve doesn't pop
      // all hexes at the exact same frame — gives the bees a moment
      // to look like they're carrying each one in.
      additions[i] = now + 600 + (i - prevCountRef.current) * 90;
    }
    setFreshUntil((prev) => ({ ...prev, ...additions }));
    prevCountRef.current = hexCount;
    // Cleanup: forget freshness after the animation duration.
    const timeout = setTimeout(() => {
      setFreshUntil((prev) => {
        const cutoff = Date.now();
        const next: Record<number, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v > cutoff) next[Number(k)] = v;
        }
        return next;
      });
    }, 1500);
    return () => clearTimeout(timeout);
  }, [hexCount]);

  // Position each hex in a wrapping honeycomb. Row 0 = bottom, growing
  // upward as the round progresses. Odd rows are offset right by HW/2
  // for proper tessellation.
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < hexCount; i++) {
    const row = Math.floor(i / HEXES_PER_ROW);
    const col = i % HEXES_PER_ROW;
    const offsetX = (row % 2) * (HW / 2);
    positions.push({
      x: HW * (col + 0.5) + offsetX,
      y: -ROW_DY * row,
    });
  }

  const totalWidth = HW * (HEXES_PER_ROW + 1);
  const rowsUsed = Math.ceil(hexCount / HEXES_PER_ROW);
  const totalHeight = ROW_DY * Math.max(rowsUsed, 1) + HEX_R * 2 + 8;

  // Anchor the most-recently-placed hex (if any) so the ambient bee
  // can buzz near "the work site."
  const latest = positions[positions.length - 1] ?? { x: HW * 0.5, y: 0 };

  return (
    <div
      style={{
        height: VIEW_HEIGHT,
        position: "relative",
        marginTop: 4,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes built-hive-pop {
          0%   { transform: scale(0.25); opacity: 0; }
          70%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes built-hive-bee {
          0%   { transform: translate(-30px, 0) rotate(-4deg); }
          25%  { transform: translate(40%, -8px) rotate(6deg); }
          50%  { transform: translate(110%, 4px) rotate(-3deg); }
          75%  { transform: translate(40%, -12px) rotate(8deg); }
          100% { transform: translate(-30px, 0) rotate(-4deg); }
        }
        @keyframes built-hive-bee-wings {
          0%, 100% { transform: scaleY(0.6); }
          50%      { transform: scaleY(1); }
        }
      `}</style>
      <svg
        viewBox={`0 ${-totalHeight + HEX_R} ${totalWidth} ${totalHeight}`}
        width="100%"
        height={VIEW_HEIGHT}
        preserveAspectRatio="xMidYMax meet"
        style={{ display: "block" }}
      >
        {/* Placed hexes */}
        {positions.map((pos, i) => {
          const popUntil = freshUntil[i];
          const isFresh = popUntil !== undefined && popUntil > Date.now();
          return (
            <g
              key={i}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: isFresh ? "built-hive-pop 0.55s ease-out" : undefined,
              }}
            >
              <polygon
                points={hexPoints(HEX_R)}
                fill="#f5b400"
                fillOpacity={0.78}
                stroke="#3a2a14"
                strokeWidth={0.8}
              />
              {/* Subtle inner highlight */}
              <polygon
                points={hexPoints(HEX_R * 0.55)}
                fill="#ffd96a"
                fillOpacity={0.55}
              />
            </g>
          );
        })}

        {/* Ambient worker bee — buzzes across the hive on a long loop. */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "built-hive-bee 7s ease-in-out infinite",
          }}
        >
          <Bee x={latest.x} y={latest.y - HEX_R - 3} />
        </g>

        {/* If the hive is empty, render a subtle ghost outline to hint
            "things will appear here." */}
        {hexCount === 0 && (
          <text
            x={totalWidth / 2}
            y={-HEX_R}
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

function Bee({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: "none" }}>
      {/* Wings (flapping) */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "built-hive-bee-wings 0.12s linear infinite",
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
      {/* Tiny eye dot */}
      <circle cx={-3} cy={-0.4} r={0.5} fill="#1a1a1f" />
    </g>
  );
}

function hexPoints(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}
