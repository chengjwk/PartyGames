// Cherry Blossom × Bold Cartoon — five rounded petals with a notch
// at each tip, small dark center disc with tiny stamens, thick dark
// outline. Lighter, springy silhouette. Pairs with pinks / whites
// best but works in any color.

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

export default function CherryBlossomBold({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_LEN = 32 * scale;
  const PETAL_W = 26 * scale;
  const CENTER_R = 10 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN = 56 * scale;
  const STROKE = 2.4 * scale;

  const W = (PETAL_LEN + CENTER_R + 18) * 2;
  const H = stemLength + PETAL_LEN + CENTER_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  // Notched petal — broad at the tip with a V cut in the middle.
  // Origin at center; tip extends along +x.
  const petalPath = `
    M 0 ${-PETAL_W * 0.32}
    Q ${PETAL_LEN * 0.5} ${-PETAL_W * 0.6} ${PETAL_LEN * 0.92} ${-PETAL_W * 0.18}
    L ${PETAL_LEN * 0.72} 0
    L ${PETAL_LEN * 0.92} ${PETAL_W * 0.18}
    Q ${PETAL_LEN * 0.5} ${PETAL_W * 0.6} 0 ${PETAL_W * 0.32}
    Q ${-PETAL_LEN * 0.16} 0 0 ${-PETAL_W * 0.32} Z
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
        stroke="#3a1f10"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />
      <ellipse
        cx={6 * scale}
        cy={-stemLength * 0.55}
        rx={LEAF_LEN * 0.2}
        ry={LEAF_LEN * 0.32}
        fill="#2e5a26"
        stroke="#0e2810"
        strokeWidth={STROKE}
        transform={`rotate(40 ${6 * scale} ${-stemLength * 0.55})`}
      />
      <g transform={`translate(0 ${-stemLength})`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = i * 72 - 90;
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <path
                d={petalPath}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={STROKE}
                strokeLinejoin="round"
              />
              {/* Highlight crescent on each petal */}
              <ellipse
                cx={PETAL_LEN * 0.45}
                cy={-PETAL_W * 0.18}
                rx={PETAL_LEN * 0.18}
                ry={PETAL_W * 0.14}
                fill="rgba(255,255,255,0.6)"
                transform={`rotate(-12 ${PETAL_LEN * 0.45} ${-PETAL_W * 0.18})`}
              />
            </g>
          );
        })}
        {/* Yellow center disc — small, cherry-blossom appropriate */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#0e0a04"
          strokeWidth={STROKE}
        />
        {/* Three tiny stamens radiating from the center */}
        {[0, 1, 2].map((i) => {
          const a = (Math.PI * 2 * i) / 3 - Math.PI / 2;
          const x = Math.cos(a) * CENTER_R * 1.5;
          const y = Math.sin(a) * CENTER_R * 1.5;
          return (
            <g key={i}>
              <line
                x1={0}
                y1={0}
                x2={x}
                y2={y}
                stroke="#7a5722"
                strokeWidth={1.6 * scale}
                strokeLinecap="round"
              />
              <circle cx={x} cy={y} r={1.8 * scale} fill="#3a2a14" />
            </g>
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.2})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
