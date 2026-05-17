// Cherry blossom × Painterly — five notched petals on a small
// curved branch (rather than the usual upright stem), so the
// picker entry reads as "blossom on a tree" rather than a
// long-stemmed flower. Petals carry a radial gradient + soft
// inner highlight matching the other painterly picker flowers.

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  petalEdge: string;
  centerContent: ReactNode;
  // Treated as the total visual height (branch + bloom) so the
  // picker `alignItems: end` lines up consistently with the other
  // species' stem-length convention.
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function CherryBlossomPainterly({
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
  const CENTER_R = 9 * scale;
  // Branch is rendered as a curve from the ground up to the bloom.
  const BRANCH_W = 6 * scale;

  const W = (PETAL_LEN + CENTER_R + 18) * 2;
  const H = stemLength + PETAL_LEN + CENTER_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const gradId = `cherry-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

  // Notched petal — broad at the tip with a V cut in the middle.
  const petalPath = `
    M 0 ${-PETAL_W * 0.32}
    Q ${PETAL_LEN * 0.5} ${-PETAL_W * 0.6} ${PETAL_LEN * 0.92} ${-PETAL_W * 0.18}
    L ${PETAL_LEN * 0.72} 0
    L ${PETAL_LEN * 0.92} ${PETAL_W * 0.18}
    Q ${PETAL_LEN * 0.5} ${PETAL_W * 0.6} 0 ${PETAL_W * 0.32}
    Q ${-PETAL_LEN * 0.16} 0 0 ${-PETAL_W * 0.32} Z
  `;

  // Branch path: starts at (0,0), curves up to (0, -stemLength)
  // with a small kink so it reads like a tree branch reaching up.
  // We do the curve in the +x direction so a side leaf reads.
  const branchPath = `
    M -4 0
    C 6 ${-stemLength * 0.25}, -10 ${-stemLength * 0.55}, 0 ${-stemLength}
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
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={petalColor} stopOpacity="1" />
          <stop offset="55%" stopColor={petalColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.65" />
        </radialGradient>
      </defs>

      {/* Branch */}
      <path
        d={branchPath}
        stroke="#3a1f10"
        strokeWidth={BRANCH_W}
        strokeLinecap="round"
        fill="none"
      />
      {/* A side twig + tiny leaf for a hint of texture. */}
      <g
        transform={`translate(${-3 * scale} ${-stemLength * 0.55}) rotate(-55)`}
      >
        <line
          x1={0}
          y1={0}
          x2={18 * scale}
          y2={0}
          stroke="#3a1f10"
          strokeWidth={BRANCH_W * 0.55}
          strokeLinecap="round"
        />
        <ellipse
          cx={20 * scale}
          cy={0}
          rx={10 * scale}
          ry={4 * scale}
          fill="#2e5a26"
          stroke="#0e2810"
          strokeWidth={1.1 * scale}
        />
      </g>

      <g transform={`translate(0 ${-stemLength})`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = i * 72 - 90;
          return (
            <g key={i} transform={`rotate(${angle})`}>
              <path
                d={petalPath}
                fill={`url(#${gradId})`}
                stroke={petalEdge}
                strokeWidth={1.3 * scale}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              {/* Soft highlight crescent */}
              <ellipse
                cx={PETAL_LEN * 0.42}
                cy={-PETAL_W * 0.18}
                rx={PETAL_LEN * 0.2}
                ry={PETAL_W * 0.15}
                fill="rgba(255,255,255,0.32)"
                transform={`rotate(-12 ${PETAL_LEN * 0.42} ${-PETAL_W * 0.18})`}
              />
            </g>
          );
        })}
        {/* Small yellow center with stamens */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={1.3 * scale}
          strokeOpacity={0.7}
        />
        {[0, 1, 2, 3].map((i) => {
          const a = (Math.PI * 2 * i) / 4 - Math.PI / 2;
          const x = Math.cos(a) * CENTER_R * 1.55;
          const y = Math.sin(a) * CENTER_R * 1.55;
          return (
            <g key={`stamen-${i}`}>
              <line
                x1={0}
                y1={0}
                x2={x}
                y2={y}
                stroke="#7a5722"
                strokeWidth={1.4 * scale}
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
