// Tulip × Painterly — three overlapping cup-petals on a tall stem
// with sword leaves. Each petal carries a radial gradient (deeper
// in the cup, lighter at the tip) and a soft inner highlight.
// Outline is thin + low-opacity for the watercolor feel.

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

export default function TulipPainterly({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const CUP_W = 60 * scale;
  const CUP_H = 64 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN = 72 * scale;
  const STROKE = 1.3 * scale;
  const CENTER_R = 13 * scale;

  const W = (CUP_W + 18) * 2;
  const H = stemLength + CUP_H + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const gradId = `tulip-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;
  const sideGradId = `tulip-side-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

  // Cup-shaped petal — tip at (0, -CUP_H*0.92), base curve at y=0.
  const petalPath = `
    M 0 ${-CUP_H * 0.92}
    C ${CUP_W * 0.32} ${-CUP_H * 0.65}, ${CUP_W * 0.45} ${-CUP_H * 0.18}, ${CUP_W * 0.22} 0
    L ${-CUP_W * 0.22} 0
    C ${-CUP_W * 0.45} ${-CUP_H * 0.18}, ${-CUP_W * 0.32} ${-CUP_H * 0.65}, 0 ${-CUP_H * 0.92}
    Z
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
        {/* Front-petal gradient: rich at the base of the cup, fading
            toward the tip. */}
        <linearGradient id={gradId} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor={petalColor} stopOpacity="1" />
          <stop offset="55%" stopColor={petalColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.7" />
        </linearGradient>
        {/* Side-petal gradient: slightly darker overall to push the
            side petals behind the front one. */}
        <linearGradient id={sideGradId} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor={shade(petalColor, 0.22)} stopOpacity="1" />
          <stop offset="100%" stopColor={shade(petalColor, 0.18)} stopOpacity="0.7" />
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
      <LeafSword
        baseX={0}
        baseY={-stemLength * 0.6}
        length={LEAF_LEN}
        angleDeg={70}
        stroke={STROKE * 0.9}
      />
      <LeafSword
        baseX={0}
        baseY={-stemLength * 0.35}
        length={LEAF_LEN * 0.85}
        angleDeg={-72}
        stroke={STROKE * 0.9}
      />

      <g transform={`translate(0 ${-stemLength})`}>
        {/* Left side petal */}
        <g transform={`rotate(-22) translate(${-CUP_W * 0.1} 0)`}>
          <path
            d={petalPath}
            fill={`url(#${sideGradId})`}
            stroke={petalEdge}
            strokeWidth={STROKE}
            strokeOpacity={0.5}
            strokeLinejoin="round"
          />
        </g>
        {/* Right side petal */}
        <g transform={`rotate(22) translate(${CUP_W * 0.1} 0)`}>
          <path
            d={petalPath}
            fill={`url(#${sideGradId})`}
            stroke={petalEdge}
            strokeWidth={STROKE}
            strokeOpacity={0.5}
            strokeLinejoin="round"
          />
        </g>
        {/* Front center petal — full gradient + soft highlight */}
        <g>
          <path
            d={petalPath}
            fill={`url(#${gradId})`}
            stroke={petalEdge}
            strokeWidth={STROKE}
            strokeOpacity={0.6}
            strokeLinejoin="round"
          />
          {/* Soft watercolor-style highlight */}
          <ellipse
            cx={-CUP_W * 0.14}
            cy={-CUP_H * 0.5}
            rx={CUP_W * 0.08}
            ry={CUP_H * 0.22}
            fill="rgba(255,255,255,0.28)"
            transform={`rotate(-10 ${-CUP_W * 0.14} ${-CUP_H * 0.5})`}
          />
        </g>
        {/* Center disc — small, low contrast */}
        <circle
          cx={0}
          cy={-CUP_H * 0.32}
          r={CENTER_R}
          fill="#3a2a14"
          stroke="#0e0a04"
          strokeWidth={1.4 * scale}
          strokeOpacity={0.65}
        />
        <circle
          cx={0}
          cy={-CUP_H * 0.32}
          r={CENTER_R - 2 * scale}
          fill="#f4cd44"
        />
        <g transform={`translate(0 ${-CUP_H * 0.32 + CENTER_R * 0.18})`}>
          {centerContent}
        </g>
      </g>
    </svg>
  );
}

function LeafSword({
  baseX,
  baseY,
  length,
  angleDeg,
  stroke,
}: {
  baseX: number;
  baseY: number;
  length: number;
  angleDeg: number;
  stroke: number;
}) {
  const width = length * 0.16;
  const d = `M 0 0
    Q ${length * 0.4} ${-width} ${length} 0
    Q ${length * 0.4} ${width * 0.6} 0 0
    Z`;
  return (
    <g transform={`translate(${baseX} ${baseY}) rotate(${angleDeg})`}>
      <path d={d} fill="#2e5a26" stroke="#0e2810" strokeWidth={stroke} />
    </g>
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
