// Lotus Pond × Painterly — a wide pond anchor for the bottom of
// the lobby picker garden. Pond ellipse with subtle ripples, two
// lily pads, and a prominent lotus bloom on the larger pad.
// Tappable as a single unit.

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  petalEdge: string;
  centerContent: ReactNode;
  // Overall height (water + bloom). Lotus pond is wider than tall.
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function LotusPondPainterly({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_LEN = 44 * scale;
  const PETAL_W = 18 * scale;
  const CENTER_R = 10 * scale;
  const POND_RX = 200 * scale;
  const POND_RY = 32 * scale;
  const PAD_RX = 48 * scale;
  const PAD_RY = 14 * scale;
  const SMALL_PAD_RX = 28 * scale;
  const SMALL_PAD_RY = 8 * scale;

  const W = (POND_RX + 20) * 2;
  const H = stemLength + POND_RY + 20;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const gradId = `lotus-pond-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

  // Lotus bloom anchored above the main lily pad's center.
  const bloomCenterX = 0;
  const bloomCenterY = -POND_RY - 6 * scale;

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
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.62" />
        </radialGradient>
      </defs>

      {/* Pond */}
      <ellipse
        cx={0}
        cy={-6 * scale}
        rx={POND_RX}
        ry={POND_RY}
        fill="#3a8acc"
        stroke="#1f5d8e"
        strokeWidth={2 * scale}
      />
      {/* Ripples */}
      <ellipse
        cx={-POND_RX * 0.32}
        cy={-POND_RY * 0.55}
        rx={POND_RX * 0.32}
        ry={POND_RY * 0.28}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.3 * scale}
      />
      <ellipse
        cx={POND_RX * 0.4}
        cy={-POND_RY * 0.15}
        rx={POND_RX * 0.22}
        ry={POND_RY * 0.2}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.2 * scale}
      />

      {/* Smaller lily pad on the right */}
      <g transform={`translate(${POND_RX * 0.5} ${-POND_RY * 0.45})`}>
        <ellipse
          cx={0}
          cy={0}
          rx={SMALL_PAD_RX}
          ry={SMALL_PAD_RY}
          fill="#3a7a36"
          stroke="#1c3a1c"
          strokeWidth={1.3 * scale}
        />
        <path
          d={`M ${-SMALL_PAD_RX * 0.05} ${-SMALL_PAD_RY * 0.2}
              L ${-SMALL_PAD_RX * 0.95} ${-SMALL_PAD_RY * 0.7}
              L ${-SMALL_PAD_RX * 0.95} ${SMALL_PAD_RY * 0.7} Z`}
          fill="#3a8acc"
          stroke="#1c3a1c"
          strokeWidth={1.1 * scale}
        />
      </g>

      {/* Main lily pad */}
      <g transform={`translate(0 ${-POND_RY * 0.6})`}>
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
              L ${-PAD_RX * 0.92} ${-PAD_RY * 0.7}
              L ${-PAD_RX * 0.92} ${PAD_RY * 0.7} Z`}
          fill="#3a8acc"
          stroke="#1c3a1c"
          strokeWidth={1.2 * scale}
        />
      </g>

      {/* Lotus bloom — 7 petals fanning upward + 2 front lower */}
      <g transform={`translate(${bloomCenterX} ${bloomCenterY})`}>
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
        {[-160, -20].map((angleDeg, i) => {
          const path = `
            M 0 0
            Q ${PETAL_LEN * 0.4} ${-PETAL_W * 0.55} ${PETAL_LEN} 0
            Q ${PETAL_LEN * 0.4} ${PETAL_W * 0.55} 0 0
            Z
          `;
          return (
            <g key={`front-${i}`} transform={`rotate(${angleDeg})`}>
              <path
                d={path}
                fill={`url(#${gradId})`}
                stroke={petalEdge}
                strokeWidth={1.3 * scale}
                strokeOpacity={0.55}
                strokeLinejoin="round"
                transform="scale(0.78 0.95)"
              />
            </g>
          );
        })}
        <circle
          cx={0}
          cy={-2}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={1.4 * scale}
          strokeOpacity={0.7}
        />
        <g transform={`translate(0 ${CENTER_R * 0.18 - 2})`}>
          {centerContent}
        </g>
      </g>
    </svg>
  );
}
