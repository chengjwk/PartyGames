// Lotus × Painterly — a stylized lotus bloom (7 pointed petals
// fanning upward from a small lily pad floating on a wisp of
// water) for the picker card. Petals carry a radial gradient +
// soft inner highlight matching the other painterly picker
// flowers. Sits low to the ground line since it grows on water.

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  petalEdge: string;
  centerContent: ReactNode;
  // Total visual height (water + pad + bloom). Lotus reads short
  // — typically the smallest of the picker species.
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function LotusPainterly({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_LEN = 40 * scale;
  const PETAL_W = 16 * scale;
  const CENTER_R = 9 * scale;
  // The "stem" is actually a small ellipse of water + a lily pad.
  const PAD_RX = 36 * scale;
  const PAD_RY = 11 * scale;
  const WATER_RX = 60 * scale;
  const WATER_RY = 14 * scale;

  const W = (PETAL_LEN + 18) * 2;
  const H = stemLength + PETAL_LEN + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const gradId = `lotus-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

  // Pointed teardrop petal: base at (0,0), tip at (length, 0).
  const petalPath = `
    M 0 0
    Q ${PETAL_LEN * 0.4} ${-PETAL_W * 0.55} ${PETAL_LEN} 0
    Q ${PETAL_LEN * 0.4} ${PETAL_W * 0.55} 0 0
    Z
  `;

  // Where the lotus bloom sits — just above the lily pad.
  const bloomY = -(stemLength * 0.5);

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

      {/* Water beneath the pad — a flattened ellipse with a faint rim
          highlight for motion. */}
      <ellipse
        cx={0}
        cy={-stemLength * 0.18}
        rx={WATER_RX}
        ry={WATER_RY}
        fill="#3a8acc"
        stroke="#1f5d8e"
        strokeWidth={1.4 * scale}
      />
      <ellipse
        cx={-WATER_RX * 0.18}
        cy={-stemLength * 0.18 - WATER_RY * 0.32}
        rx={WATER_RX * 0.45}
        ry={WATER_RY * 0.28}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.2 * scale}
      />
      {/* Lily pad — green disc with a small notch wedge cut out. */}
      <g transform={`translate(0 ${-stemLength * 0.34})`}>
        <ellipse
          cx={0}
          cy={0}
          rx={PAD_RX}
          ry={PAD_RY}
          fill="#3a7a36"
          stroke="#1c3a1c"
          strokeWidth={1.4 * scale}
        />
        <path
          d={`M ${-PAD_RX * 0.05} ${-PAD_RY * 0.2}
              L ${-PAD_RX * 0.95} ${-PAD_RY * 0.7}
              L ${-PAD_RX * 0.95} ${PAD_RY * 0.7} Z`}
          fill="#3a8acc"
          stroke="#1c3a1c"
          strokeWidth={1.2 * scale}
        />
      </g>

      {/* Lotus bloom — 7 petals fanning upward in roughly 180° */}
      <g transform={`translate(0 ${bloomY})`}>
        {/* Back tall petals first (drawn first → sit behind) */}
        {[-90, -115, -65, -140, -40].map((angleDeg, i) => {
          const len = i < 3 ? PETAL_LEN : PETAL_LEN * 0.85;
          const wid = i < 3 ? PETAL_W : PETAL_W * 1.1;
          const path = `
            M 0 0
            Q ${len * 0.4} ${-wid * 0.55} ${len} 0
            Q ${len * 0.4} ${wid * 0.55} 0 0
            Z
          `;
          return (
            <g key={i} transform={`rotate(${angleDeg})`}>
              <path
                d={path}
                fill={`url(#${gradId})`}
                stroke={petalEdge}
                strokeWidth={1.3 * scale}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              {/* Tip highlight */}
              <ellipse
                cx={len * 0.62}
                cy={-wid * 0.14}
                rx={len * 0.15}
                ry={wid * 0.18}
                fill="rgba(255,255,255,0.32)"
              />
            </g>
          );
        })}
        {/* Two front lower petals, drooping outward */}
        {[-160, -20].map((angleDeg, i) => (
          <g key={`f-${i}`} transform={`rotate(${angleDeg})`}>
            <path
              d={petalPath}
              fill={`url(#${gradId})`}
              stroke={petalEdge}
              strokeWidth={1.3 * scale}
              strokeOpacity={0.55}
              strokeLinejoin="round"
              transform={`scale(0.78 0.95)`}
            />
          </g>
        ))}
        {/* Center disc + emoji slot */}
        <circle
          cx={0}
          cy={-2}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={1.3 * scale}
          strokeOpacity={0.7}
        />
        <g transform={`translate(0 ${CENTER_R * 0.18 - 2})`}>
          {centerContent}
        </g>
      </g>
    </svg>
  );
}
