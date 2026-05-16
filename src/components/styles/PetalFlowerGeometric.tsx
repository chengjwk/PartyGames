// Variant E — Geometric / modern. Flat colors, sharp angular petals,
// no outline. App-icon / minimalist flavor. The petal shape is a
// teardrop pointing outward from the center; petals overlap slightly
// for a layered fan look without an outline relying on dark borders.

import type { ReactNode } from "react";

interface Props {
  petalColor: string;
  petalEdge: string; // unused (no outline) — kept for prop parity
  centerContent: ReactNode;
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function PetalFlowerGeometric({
  petalColor,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_LEN = 46 * scale;
  const PETAL_W = 20 * scale;
  const CENTER_R = 14 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN = 58 * scale;

  const W = (PETAL_LEN + CENTER_R + 14) * 2;
  const H = stemLength + PETAL_LEN + CENTER_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  // Two-tone shade for visual depth without outlines.
  const shade = mix(petalColor, "#000000", 0.22);

  // Petal path — teardrop from origin pointing along +x.
  const petalPath = `M 0 0
    Q ${PETAL_LEN * 0.4} ${-PETAL_W * 0.55} ${PETAL_LEN} 0
    Q ${PETAL_LEN * 0.4} ${PETAL_W * 0.55} 0 0
    Z`;

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
      {/* Stem — straight, no rounding fanfare */}
      <rect
        x={-STEM_W / 2}
        y={-stemLength}
        width={STEM_W}
        height={stemLength}
        fill="#2a5028"
      />
      {/* Leaf — single tilted diamond */}
      <g
        transform={`translate(${6 * scale} ${-stemLength * 0.55}) rotate(35)`}
      >
        <path
          d={`M 0 0 Q ${LEAF_LEN * 0.5} ${-LEAF_LEN * 0.16} ${LEAF_LEN} 0
              Q ${LEAF_LEN * 0.5} ${LEAF_LEN * 0.16} 0 0 Z`}
          fill="#2a5028"
        />
        <path
          d={`M 0 0 Q ${LEAF_LEN * 0.5} ${-LEAF_LEN * 0.08} ${LEAF_LEN} 0 Z`}
          fill="#3d6f33"
        />
      </g>
      <g transform={`translate(0 ${-stemLength})`}>
        {/* Back layer of shade petals — offset slightly for depth */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = i * 72 - 90;
          return (
            <g key={`back-${i}`} transform={`rotate(${angle})`}>
              <path
                d={petalPath}
                fill={shade}
                transform={`translate(${CENTER_R * 0.2} 0)`}
              />
            </g>
          );
        })}
        {/* Front layer */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = i * 72 - 90 + 18; // offset 18° so front sits in between
          return (
            <g key={`front-${i}`} transform={`rotate(${angle})`}>
              <path d={petalPath} fill={petalColor} />
            </g>
          );
        })}
        <circle cx={0} cy={0} r={CENTER_R} fill="#3a2a14" />
        <circle cx={0} cy={0} r={CENTER_R * 0.7} fill="#f4cd44" />
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}

// Mix two hex colors by weight 0..1 (1 = fully blendColor).
function mix(base: string, blendColor: string, t: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(blendColor);
  if (!a || !b) return base;
  const r = Math.round(a.r * (1 - t) + b.r * t);
  const g = Math.round(a.g * (1 - t) + b.g * t);
  const bl = Math.round(a.b * (1 - t) + b.b * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
