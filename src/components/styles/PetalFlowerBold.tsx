// Variant B — Bold cartoon. Thicker dark outlines, saturated fill,
// punchy highlight. Reads cleanly at a glance, kid-friendly feel.

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

export default function PetalFlowerBold({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_R = 24 * scale;
  const PETAL_OFFSET = 22 * scale;
  const CENTER_R = 15 * scale;
  const STEM_W = 6 * scale;
  const LEAF_LEN = 60 * scale;
  const STROKE = 2.5 * scale;

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
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-stemLength}
        stroke="#1a3a18"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />
      {/* Leaf */}
      <ellipse
        cx={6 * scale}
        cy={-stemLength * 0.55}
        rx={LEAF_LEN * 0.2}
        ry={LEAF_LEN * 0.34}
        fill="#2e5a26"
        stroke="#0e2810"
        strokeWidth={STROKE}
        transform={`rotate(40 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
          const cx = PETAL_OFFSET * Math.cos(a);
          const cy = PETAL_OFFSET * Math.sin(a);
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={PETAL_R}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={STROKE}
              />
              {/* Highlight crescent — a smaller offset circle in lighter shade */}
              <ellipse
                cx={cx - PETAL_R * 0.32}
                cy={cy - PETAL_R * 0.32}
                rx={PETAL_R * 0.32}
                ry={PETAL_R * 0.22}
                fill="rgba(255,255,255,0.55)"
                transform={`rotate(-25 ${cx - PETAL_R * 0.32} ${cy - PETAL_R * 0.32})`}
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
          strokeWidth={STROKE}
        />
        <circle cx={0} cy={0} r={CENTER_R - STROKE * 1.6} fill="#f4cd44" />
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
