// Simple 5-round-petal flower — WordHive's "original" picker species,
// matching the stylized flowers drawn into GardenBackground. Used in
// the game-picker garden alongside LilyFlower (MathHive) and
// DaisyFlower (Pollinart) so each game has a distinct silhouette.
//
// Same prop surface as the other flower components so all three can
// be swapped in a single render branch.

import type { ReactNode } from "react";

interface PetalFlowerProps {
  petalColor: string;
  // Darker shade for petal outlines / depth.
  petalEdge: string;
  centerContent: ReactNode;
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function PetalFlower({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: PetalFlowerProps) {
  // Bloom geometry — 5 circular petals on a star pattern + a fat yellow
  // center disc. Petal radius is the dominant size knob.
  const PETAL_R = 22 * scale;
  // Distance from the center disc out to the center of each petal.
  // Slightly less than 2·PETAL_R so the petals overlap and look like
  // one continuous bloom rather than five floating circles.
  const PETAL_OFFSET = 22 * scale;
  const CENTER_R = 14 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN = 56 * scale;

  // Overall bounding box.
  const W = (PETAL_OFFSET + PETAL_R + 14) * 2;
  const H = stemLength + PETAL_OFFSET + PETAL_R + 24;

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

      {/* Single leaf, like the garden BG flowers. */}
      <ellipse
        cx={6 * scale}
        cy={-stemLength * 0.55}
        rx={LEAF_LEN * 0.18}
        ry={LEAF_LEN * 0.32}
        fill="#345e30"
        stroke="#1c3a1c"
        strokeWidth={1.3 * scale}
        transform={`rotate(35 ${6 * scale} ${-stemLength * 0.55})`}
      />

      {/* Bloom head */}
      <g transform={`translate(0 ${-stemLength})`}>
        {/* 5 round petals on a star pattern */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
          const cx = PETAL_OFFSET * Math.cos(a);
          const cy = PETAL_OFFSET * Math.sin(a);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={PETAL_R}
              fill={petalColor}
              stroke={petalEdge}
              strokeWidth={1.4 * scale}
            />
          );
        })}
        {/* Center disc */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={2 * scale}
        />
        <g transform={`translate(0 ${CENTER_R * 0.15})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
