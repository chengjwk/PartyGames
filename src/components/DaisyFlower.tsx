// Daisy SVG used by the Pollinart slot in the game-picker garden.
// Differentiates from the two LilyFlower games visually with rounded
// white petals around a fat yellow center. Two narrow leaves on the
// stem keep the silhouette unique from the lily.
//
// Shared between LobbyPlay (interactive button) and LobbyHost (TV
// preview); the caller wraps in <button> if needed.

import type { ReactNode } from "react";

interface DaisyFlowerProps {
  // Petal fill (e.g. white "#f8f4ec" or pink for variety).
  petalColor: string;
  petalEdge: string; // outline / stamp color for depth
  centerContent: ReactNode;
  stemLength: number;
  scale?: number;
  // Number of petals — daisies often have many. Default 12.
  petalCount?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function DaisyFlower({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  petalCount = 12,
  swayKeyframes,
  bloomIn,
}: DaisyFlowerProps) {
  const PETAL_LEN = 44 * scale;
  const PETAL_W = 14 * scale;
  const CENTER_R = 20 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN_A = 56 * scale;
  const LEAF_LEN_B = 44 * scale;

  const W = (PETAL_LEN + CENTER_R + 14) * 2;
  const H = stemLength + PETAL_LEN + CENTER_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`${-W / 2} ${-H + 4} ${W} ${H}`}
      aria-hidden
      style={{
        transformBox: "fill-box",
        transformOrigin: "50% 100%",
        animation: sway,
        overflow: "visible",
      }}
    >
      {/* Stem */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-stemLength}
        stroke="#284c25"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />

      {/* Two narrow leaves */}
      <DaisyLeaf
        baseX={0}
        baseY={-stemLength * 0.42}
        length={LEAF_LEN_A}
        angleDeg={62}
      />
      <DaisyLeaf
        baseX={0}
        baseY={-stemLength * 0.2}
        length={LEAF_LEN_B}
        angleDeg={-60}
      />

      {/* Flower head */}
      <g transform={`translate(0 ${-stemLength})`}>
        {/* Petals — rounded oblong shapes pointing radially. */}
        {Array.from({ length: petalCount }, (_, i) => {
          const angle = (360 / petalCount) * i - 90;
          return (
            <g key={`p-${i}`} transform={`rotate(${angle})`}>
              <ellipse
                cx={CENTER_R + PETAL_LEN / 2 - 2}
                cy={0}
                rx={PETAL_LEN / 2}
                ry={PETAL_W / 2}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={1.2 * scale}
              />
              {/* subtle highlight near tip */}
              <ellipse
                cx={CENTER_R + PETAL_LEN - PETAL_LEN * 0.18}
                cy={0}
                rx={PETAL_LEN * 0.08}
                ry={PETAL_W * 0.25}
                fill="#ffffff"
                opacity={0.45}
              />
            </g>
          );
        })}

        {/* Center disc — fluffy yellow */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={2 * scale}
        />
        {/* Tiny seed dots in the center for daisy texture */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = ((Math.PI * 2) / 8) * i;
          const r = CENTER_R * 0.55;
          return (
            <circle
              key={`seed-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.6 * scale}
              fill="#a87a14"
              opacity={0.6}
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.15})`}>{centerContent}</g>
      </g>
    </svg>
  );
}

function DaisyLeaf({
  baseX,
  baseY,
  length,
  angleDeg,
}: {
  baseX: number;
  baseY: number;
  length: number;
  angleDeg: number;
}) {
  const width = length * 0.22;
  const d = [
    `M 0 0`,
    `C ${length * 0.25} ${-width}, ${length * 0.7} ${-width * 0.7}, ${length} 0`,
    `C ${length * 0.7} ${width * 0.7}, ${length * 0.25} ${width}, 0 0`,
    `Z`,
  ].join(" ");
  return (
    <g transform={`translate(${baseX} ${baseY}) rotate(${angleDeg})`}>
      <path d={d} fill="#3a6a30" stroke="#1c3a1c" strokeWidth={1.4} />
      <line
        x1={length * 0.06}
        y1={0}
        x2={length * 0.95}
        y2={0}
        stroke="#1c3a1c"
        strokeOpacity={0.4}
        strokeWidth={1.1}
      />
    </g>
  );
}
