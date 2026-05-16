// Sunflower × Bold Cartoon — fat brown seedy disc, ~14 chunky
// narrow petals, thick dark outline on every shape, and a highlight
// crescent on each petal so the bloom reads at-a-glance. Big
// silhouette, kid-friendly.

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  // Edge / outline color. Kept dark for the cartoon look.
  petalEdge: string;
  centerContent: ReactNode;
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function SunflowerBold({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_COUNT = 14;
  const PETAL_LEN = 42 * scale;
  const PETAL_W = 16 * scale;
  const CENTER_R = 22 * scale;
  const STEM_W = 6 * scale;
  const LEAF_LEN = 64 * scale;
  const STROKE = 2.4 * scale;

  const W = (CENTER_R + PETAL_LEN + 20) * 2;
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
        stroke="#1a3a18"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />
      <ellipse
        cx={6 * scale}
        cy={-stemLength * 0.55}
        rx={LEAF_LEN * 0.21}
        ry={LEAF_LEN * 0.36}
        fill="#2e5a26"
        stroke="#0e2810"
        strokeWidth={STROKE}
        transform={`rotate(40 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i;
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <ellipse
                cx={CENTER_R + PETAL_LEN / 2 - 4}
                cy={0}
                rx={PETAL_LEN / 2}
                ry={PETAL_W / 2}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={STROKE}
              />
              {/* Cartoon highlight crescent near the petal tip */}
              <ellipse
                cx={CENTER_R + PETAL_LEN * 0.78}
                cy={-PETAL_W * 0.12}
                rx={PETAL_LEN * 0.12}
                ry={PETAL_W * 0.2}
                fill="rgba(255,255,255,0.55)"
              />
            </g>
          );
        })}
        {/* Seedy center disc */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#3a1f08"
          stroke="#0e0a04"
          strokeWidth={STROKE}
        />
        <circle cx={0} cy={0} r={CENTER_R - STROKE * 1.6} fill="#4a2810" />
        {/* Seed-dot stipple */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((Math.PI * 2) / 12) * i;
          const r = CENTER_R * 0.66;
          return (
            <circle
              key={`s1-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.6 * scale}
              fill="#1a0e04"
              opacity={0.85}
            />
          );
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const a = ((Math.PI * 2) / 7) * i + Math.PI / 7;
          const r = CENTER_R * 0.34;
          return (
            <circle
              key={`s2-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.5 * scale}
              fill="#1a0e04"
              opacity={0.7}
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
