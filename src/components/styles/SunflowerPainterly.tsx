// Sunflower × Painterly — fat seedy disc + ~14 chunky petals,
// each petal radial-gradient (saturated near disc, lighter near
// tip) with a soft inner highlight. Thin low-opacity outline so it
// reads watercolor / hand-painted rather than cartoon-bold.

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

export default function SunflowerPainterly({
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
  const STEM_W = 5 * scale;
  const LEAF_LEN = 66 * scale;
  // Outline weight + opacity tuned for painterly: visible enough to
  // separate the petals from the disc, soft enough to read as
  // brush-edge rather than a hard line.
  const STROKE = 1.3 * scale;

  const W = (CENTER_R + PETAL_LEN + 20) * 2;
  const H = stemLength + CENTER_R + PETAL_LEN + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const gradId = `sunflower-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;
  const leafGradId = `sunflower-leaf-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

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
      <defs>
        {/* Petal gradient — strongest at the inner (disc) end of each
            petal, fading toward the tip. */}
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={petalColor} stopOpacity="1" />
          <stop offset="60%" stopColor={petalColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={leafGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d6f33" />
          <stop offset="100%" stopColor="#1c3a1c" />
        </linearGradient>
      </defs>

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
        rx={LEAF_LEN * 0.21}
        ry={LEAF_LEN * 0.36}
        fill={`url(#${leafGradId})`}
        stroke="#0e2810"
        strokeWidth={1.4 * scale}
        transform={`rotate(40 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {/* Petals — drawn as ellipses oriented out from the center
            with the gradient applied along their long axis. */}
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i;
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <ellipse
                cx={CENTER_R + PETAL_LEN / 2 - 4}
                cy={0}
                rx={PETAL_LEN / 2}
                ry={PETAL_W / 2}
                fill={`url(#${gradId})`}
                stroke={petalEdge}
                strokeWidth={STROKE}
                strokeOpacity={0.55}
              />
              {/* Soft inner highlight — a sliver near the disc end */}
              <ellipse
                cx={CENTER_R + PETAL_LEN * 0.22}
                cy={-PETAL_W * 0.12}
                rx={PETAL_LEN * 0.16}
                ry={PETAL_W * 0.18}
                fill="rgba(255,255,255,0.32)"
              />
            </g>
          );
        })}
        {/* Seedy center — softer brown with stippled seeds. */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#4a2810"
          stroke="#1a0e04"
          strokeWidth={1.6 * scale}
          strokeOpacity={0.7}
        />
        {Array.from({ length: 14 }, (_, i) => {
          const a = ((Math.PI * 2) / 14) * i;
          const r = CENTER_R * 0.66;
          return (
            <circle
              key={`s1-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.5 * scale}
              fill="#1a0e04"
              opacity={0.75}
            />
          );
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const a = ((Math.PI * 2) / 8) * i + Math.PI / 8;
          const r = CENTER_R * 0.34;
          return (
            <circle
              key={`s2-${i}`}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.4 * scale}
              fill="#1a0e04"
              opacity={0.65}
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
