// Variant D — Sunflower. Many narrow petals fanning around a fat
// textured center disc. Bigger silhouette than the 5-petal versions,
// reads as "sunflower" or "asters". Petal color drives the rim;
// center is always the seedy brown disc.

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  petalEdge: string;
  centerContent: ReactNode;
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function PetalFlowerSunflower({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_COUNT = 16;
  const PETAL_LEN = 38 * scale;
  const PETAL_W = 12 * scale;
  const CENTER_R = 22 * scale;
  const STEM_W = 5.5 * scale;
  const LEAF_LEN = 64 * scale;

  const W = (CENTER_R + PETAL_LEN + 18) * 2;
  const H = stemLength + CENTER_R + PETAL_LEN + 24;

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
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-stemLength}
        stroke="#244022"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />
      <ellipse
        cx={6 * scale}
        cy={-stemLength * 0.55}
        rx={LEAF_LEN * 0.2}
        ry={LEAF_LEN * 0.34}
        fill="#345e30"
        stroke="#1c3a1c"
        strokeWidth={1.4 * scale}
        transform={`rotate(40 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {/* Back layer of petals — narrower, slightly offset */}
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i;
          return (
            <g key={`p-${i}`} transform={`rotate(${angle})`}>
              <ellipse
                cx={CENTER_R + PETAL_LEN / 2 - 4}
                cy={0}
                rx={PETAL_LEN / 2}
                ry={PETAL_W / 2}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={1.1 * scale}
                strokeOpacity={0.45}
              />
              {/* Subtle inner shading near the disc */}
              <ellipse
                cx={CENTER_R + PETAL_LEN * 0.18}
                cy={0}
                rx={PETAL_LEN * 0.16}
                ry={PETAL_W * 0.42}
                fill="rgba(0,0,0,0.12)"
              />
            </g>
          );
        })}
        {/* Center disc with seedy texture */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#4a2a10"
          stroke="#1a0e04"
          strokeWidth={1.8 * scale}
        />
        {Array.from({ length: 14 }, (_, i) => {
          const a = ((Math.PI * 2) / 14) * i;
          const r = CENTER_R * 0.62;
          return (
            <circle
              key={`s1-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.6 * scale}
              fill="#1a0e04"
              opacity={0.65}
            />
          );
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const a = ((Math.PI * 2) / 8) * i + Math.PI / 8;
          const r = CENTER_R * 0.32;
          return (
            <circle
              key={`s2-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.4 * scale}
              fill="#1a0e04"
              opacity={0.55}
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.15})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
