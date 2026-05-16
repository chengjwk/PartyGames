// Variant C — Painterly. Each petal has a gradient (saturated near
// the center, lighter at the tip) + a soft outline. Reads more like
// a watercolor / brush-painted illustration than a flat sticker.

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

export default function PetalFlowerPainterly({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_R = 23 * scale;
  const PETAL_OFFSET = 22 * scale;
  const CENTER_R = 14 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN = 60 * scale;

  const W = (PETAL_OFFSET + PETAL_R + 14) * 2;
  const H = stemLength + PETAL_OFFSET + PETAL_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  // Stable gradient id-ish suffix per render — we use a single shared
  // gradient since all petals use the same color set.
  const gradId = `petal-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;
  const leafGradId = `leaf-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

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
        <radialGradient id={gradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={petalColor} stopOpacity="1" />
          <stop offset="55%" stopColor={petalColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.65" />
        </radialGradient>
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
        rx={LEAF_LEN * 0.19}
        ry={LEAF_LEN * 0.33}
        fill={`url(#${leafGradId})`}
        stroke="#0e2810"
        strokeWidth={1.4 * scale}
        transform={`rotate(35 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
          const cx = PETAL_OFFSET * Math.cos(a);
          const cy = PETAL_OFFSET * Math.sin(a);
          // Petal is rendered as an ellipse oriented OUT from center, so
          // the gradient feels like the inner-petal is rich and the
          // outer rim fades toward the highlight.
          const angDeg = (a * 180) / Math.PI;
          return (
            <g key={i} transform={`translate(${cx} ${cy}) rotate(${angDeg + 90})`}>
              <ellipse
                cx={0}
                cy={0}
                rx={PETAL_R * 0.95}
                ry={PETAL_R}
                fill={`url(#${gradId})`}
                stroke={petalEdge}
                strokeWidth={1.2 * scale}
                strokeOpacity={0.65}
              />
              {/* Subtle inner crescent for a hand-painted highlight */}
              <ellipse
                cx={-PETAL_R * 0.15}
                cy={-PETAL_R * 0.2}
                rx={PETAL_R * 0.35}
                ry={PETAL_R * 0.55}
                fill="rgba(255,255,255,0.28)"
              />
            </g>
          );
        })}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#3a2a14"
          stroke="#0e0a04"
          strokeWidth={1.6 * scale}
        />
        <circle cx={0} cy={0} r={CENTER_R - 3 * scale} fill="#f4cd44" />
        {/* Tiny seed dots for a daisy-style stippled center */}
        {Array.from({ length: 7 }, (_, i) => {
          const a = ((Math.PI * 2) / 7) * i;
          const r = CENTER_R * 0.5;
          return (
            <circle
              key={i}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.4 * scale}
              fill="#7a4a14"
              opacity={0.7}
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
