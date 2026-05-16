// Daffodil × Bold Cartoon — six pointed star petals fanning out
// behind a tall trumpet (corona). Thick dark outlines, single
// highlight crescent on the trumpet rim. Recognizably daffodil even
// at small sizes; pairs nicely with golds and oranges, but works in
// white too (the trumpet provides contrast).

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  // Optional accent color for the trumpet/corona. If unset, we
  // shade the petal color by 22% to keep colors related.
  petalEdge: string;
  centerContent: ReactNode;
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
  // Trumpet (corona) color override. Defaults to a slightly darker
  // version of the petal color if not provided.
  trumpetColor?: string;
}

export default function DaffodilBold({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
  trumpetColor,
}: Props) {
  const PETAL_LEN = 36 * scale;
  const PETAL_W = 22 * scale;
  const TRUMPET_R = 18 * scale;
  const STEM_W = 6 * scale;
  const LEAF_LEN = 70 * scale;
  const STROKE = 2.4 * scale;

  const trumpet = trumpetColor ?? shade(petalColor, 0.25);

  const W = (PETAL_LEN + TRUMPET_R + 18) * 2;
  const H = stemLength + PETAL_LEN + TRUMPET_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  // Daffodil petal: a pointed teardrop from origin to (PETAL_LEN, 0).
  const petalPath = `
    M 0 0
    Q ${PETAL_LEN * 0.3} ${-PETAL_W * 0.55} ${PETAL_LEN} 0
    Q ${PETAL_LEN * 0.3} ${PETAL_W * 0.55} 0 0 Z
  `;

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
        rx={LEAF_LEN * 0.18}
        ry={LEAF_LEN * 0.32}
        fill="#2e5a26"
        stroke="#0e2810"
        strokeWidth={STROKE}
        transform={`rotate(70 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {/* 6 outer petals at 60° intervals */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = i * 60 - 90;
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <path
                d={petalPath}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={STROKE}
                strokeLinejoin="round"
              />
              {/* Tip highlight */}
              <ellipse
                cx={PETAL_LEN * 0.7}
                cy={-PETAL_W * 0.1}
                rx={PETAL_LEN * 0.12}
                ry={PETAL_W * 0.18}
                fill="rgba(255,255,255,0.5)"
              />
            </g>
          );
        })}
        {/* Trumpet (corona) — a chunkier circle in front + a small
            ellipse on top to suggest the open mouth. */}
        <circle
          cx={0}
          cy={0}
          r={TRUMPET_R}
          fill={trumpet}
          stroke={petalEdge}
          strokeWidth={STROKE}
        />
        <ellipse
          cx={0}
          cy={-TRUMPET_R * 0.3}
          rx={TRUMPET_R * 0.85}
          ry={TRUMPET_R * 0.45}
          fill={shade(trumpet, 0.18)}
          stroke={petalEdge}
          strokeWidth={STROKE * 0.9}
        />
        {/* Highlight crescent on the trumpet's rim */}
        <ellipse
          cx={-TRUMPET_R * 0.45}
          cy={-TRUMPET_R * 0.15}
          rx={TRUMPET_R * 0.22}
          ry={TRUMPET_R * 0.42}
          fill="rgba(255,255,255,0.55)"
          transform={`rotate(-25 ${-TRUMPET_R * 0.45} ${-TRUMPET_R * 0.15})`}
        />
        <g transform={`translate(0 ${TRUMPET_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}

function shade(hex: string, t: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - t)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - t)));
  const b = Math.max(0, Math.round((n & 255) * (1 - t)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
