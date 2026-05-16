// Tulip × Bold Cartoon — three overlapping cup-shaped petals on a
// tall stem with two sword-shaped leaves. Thick dark outline on
// everything, single bright highlight on the front petal. Reads as
// a "spring tulip" silhouette even at small sizes.

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

export default function TulipBold({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const CUP_W = 60 * scale; // overall width of the bloom
  const CUP_H = 64 * scale; // overall height
  const STEM_W = 6 * scale;
  const LEAF_LEN = 70 * scale;
  const STROKE = 2.4 * scale;

  // Center disc tucked inside the bloom for emoji slot.
  const CENTER_R = 14 * scale;

  const W = (CUP_W + 18) * 2;
  const H = stemLength + CUP_H + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  // Cup-shaped petal path. Origin at the top of the petal tip, opens
  // downward into a rounded base. Drawn so that translating to the
  // bottom-center of the bloom and rotating slightly gives natural
  // overlapping petals.
  // Tip at (0, -CUP_H), base curve at y=0.
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
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-stemLength}
        stroke="#1a3a18"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />
      {/* Two sword leaves curving outward from the lower stem. */}
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

      {/* Bloom — origin at the base of the cup. */}
      <g transform={`translate(0 ${-stemLength})`}>
        {/* Left side petal (drawn first → sits behind) */}
        <g transform={`rotate(-22) translate(${-CUP_W * 0.1} 0)`}>
          <path
            d={petalPath}
            fill={shade(petalColor, 0.18)}
            stroke={petalEdge}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </g>
        {/* Right side petal */}
        <g transform={`rotate(22) translate(${CUP_W * 0.1} 0)`}>
          <path
            d={petalPath}
            fill={shade(petalColor, 0.18)}
            stroke={petalEdge}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </g>
        {/* Front center petal — full color + cartoon highlight */}
        <g>
          <path
            d={petalPath}
            fill={petalColor}
            stroke={petalEdge}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          {/* Cartoon highlight crescent */}
          <ellipse
            cx={-CUP_W * 0.15}
            cy={-CUP_H * 0.55}
            rx={CUP_W * 0.07}
            ry={CUP_H * 0.18}
            fill="rgba(255,255,255,0.55)"
            transform={`rotate(-12 ${-CUP_W * 0.15} ${-CUP_H * 0.55})`}
          />
        </g>
        {/* Tiny disc near the bloom base for the emoji slot. Sits
            on top of the petals so the emoji is unobstructed. */}
        <circle
          cx={0}
          cy={-CUP_H * 0.32}
          r={CENTER_R}
          fill="#3a2a14"
          stroke="#0e0a04"
          strokeWidth={STROKE}
        />
        <circle
          cx={0}
          cy={-CUP_H * 0.32}
          r={CENTER_R - STROKE * 1.6}
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

// Darken a hex color by `t` (0..1). Used to give the side petals a
// slightly deeper tone so they read as behind the front petal.
function shade(hex: string, t: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - t)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - t)));
  const b = Math.max(0, Math.round((n & 255) * (1 - t)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
