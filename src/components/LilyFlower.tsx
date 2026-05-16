// Stylized lily SVG used by the game-picker flowers (phone) and the
// host TV display. Six pointed petals arranged in a star, six stamens
// peeking between them, two long lanceolate leaves on the stem.
//
// Shared between LobbyPlay (interactive button) and LobbyHost (decorative
// preview). The container decides whether to wrap it in a <button>.

import type { ReactNode } from "react";

interface LilyFlowerProps {
  // Hex color for the petal fill.
  petalColor: string;
  // Lighter highlight color for the inner-petal highlights, suggesting
  // the petal curling and catching light.
  petalHighlight: string;
  // Rendered in the center disc (typically an emoji like 🐝 / 🧮).
  centerContent: ReactNode;
  // Vertical stem length from base to flower head, in SVG units.
  stemLength: number;
  // Linear scale for the flower head + leaves (1 = default size).
  scale?: number;
  // CSS animation keyframes name to apply for sway. Leave undefined for
  // a static flower.
  swayKeyframes?: string;
  // For the bloom-in entrance animation (optional).
  bloomIn?: boolean;
}

export default function LilyFlower({
  petalColor,
  petalHighlight,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: LilyFlowerProps) {
  // Flower-head geometry (in raw units; multiplied by `scale` below).
  const PETAL_LEN = 58 * scale;
  const PETAL_W = 16 * scale;
  const CENTER_R = 18 * scale;
  const STAMEN_LEN = PETAL_LEN * 0.36;
  const STAMEN_TIP_R = 3 * scale;
  const STEM_W = 5 * scale;
  const LEAF_LEN_A = 70 * scale;
  const LEAF_LEN_B = 56 * scale;

  // Bounding box: head sits at y = -stemLength, extends ±PETAL_LEN around it.
  // Width = 2*(PETAL_LEN) + a bit of margin; height = stem + 2*PETAL_LEN.
  const W = (PETAL_LEN + 14) * 2;
  const H = stemLength + PETAL_LEN + 24;

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
        // Sway origin at the very bottom of the SVG so the flower head
        // arcs gently like a real flower in a breeze.
        transformBox: "fill-box",
        transformOrigin: "50% 100%",
        animation: sway,
        overflow: "visible",
      }}
    >
      {/* Stem */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-stemLength}
        stroke="#284c25"
        strokeWidth={STEM_W}
        strokeLinecap="round"
      />

      {/* Lily leaves — long, narrow, lanceolate. Two leaves at different
          heights on opposite sides of the stem. */}
      <LilyLeaf
        baseX={0}
        baseY={-stemLength * 0.42}
        length={LEAF_LEN_A}
        angleDeg={70}
      />
      <LilyLeaf
        baseX={0}
        baseY={-stemLength * 0.18}
        length={LEAF_LEN_B}
        angleDeg={-65}
      />

      {/* Flower head — origin at (0, -stemLength) */}
      <g transform={`translate(0 ${-stemLength})`}>
        {/* Petals (back layer) */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          // Angle 0 = pointing up; petals 60° apart.
          const angle = i * 60 - 90; // -90 puts petal 0 along +x in svg-rotated frame
          return (
            <g key={`petal-${i}`} transform={`rotate(${angle})`}>
              <path
                d={lilyPetalPath(PETAL_LEN, PETAL_W)}
                fill={petalColor}
                stroke="#3a2a14"
                strokeWidth={1.4 * scale}
                strokeLinejoin="round"
              />
              {/* Highlight near tip suggesting petal curl */}
              <ellipse
                cx={PETAL_LEN * 0.62}
                cy={0}
                rx={PETAL_LEN * 0.16}
                ry={PETAL_W * 0.5}
                fill={petalHighlight}
                opacity={0.55}
              />
              {/* Vein down the middle of each petal */}
              <line
                x1={PETAL_LEN * 0.05}
                y1={0}
                x2={PETAL_LEN * 0.92}
                y2={0}
                stroke="#3a2a14"
                strokeOpacity={0.22}
                strokeWidth={1.2 * scale}
              />
            </g>
          );
        })}

        {/* Stamens — short tendrils between the petals, dark tips */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = i * 60 - 60; // offset 30° from petals
          const a = (angle * Math.PI) / 180;
          const sx = Math.cos(a) * STAMEN_LEN;
          const sy = Math.sin(a) * STAMEN_LEN;
          return (
            <g key={`stamen-${i}`}>
              <line
                x1={0}
                y1={0}
                x2={sx}
                y2={sy}
                stroke="#7a5722"
                strokeWidth={1.8 * scale}
                strokeLinecap="round"
              />
              <circle cx={sx} cy={sy} r={STAMEN_TIP_R} fill="#5a3a14" />
            </g>
          );
        })}

        {/* Center disc */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={2 * scale}
        />
        {/* Center content (emoji etc.). Rendered as a foreignObject is
            heavier; just use SVG <text> and let the caller pass a string
            via the centerContent prop wrapped in a <text> if needed.
            Simpler: assume centerContent renders as an SVG-compatible
            child (text/emoji). */}
        <g transform={`translate(0 ${CENTER_R * 0.15})`}>{centerContent}</g>
      </g>
    </svg>
  );
}

// One lanceolate (long & narrow, pointed) lily leaf. `angleDeg` rotates
// from "pointing right" so 70° rotates up-right, -65° down-left, etc.
function LilyLeaf({
  baseX,
  baseY,
  length,
  angleDeg,
}: {
  baseX: number;
  baseY: number;
  length: number;
  angleDeg: number;
}) {
  // Tapered leaf path going from (0,0) to (length, 0) along +x,
  // with the widest point near the middle and tapering to a point at the tip.
  const width = length * 0.18;
  const d = [
    `M 0 0`,
    `C ${length * 0.2} ${-width}, ${length * 0.65} ${-width * 0.85}, ${length} 0`,
    `C ${length * 0.65} ${width * 0.85}, ${length * 0.2} ${width}, 0 0`,
    `Z`,
  ].join(" ");
  return (
    <g transform={`translate(${baseX} ${baseY}) rotate(${angleDeg})`}>
      <path d={d} fill="#3a6a30" stroke="#1c3a1c" strokeWidth={1.5} />
      {/* Central vein */}
      <line
        x1={length * 0.05}
        y1={0}
        x2={length * 0.95}
        y2={0}
        stroke="#1c3a1c"
        strokeOpacity={0.4}
        strokeWidth={1.2}
      />
    </g>
  );
}

// Teardrop/almond petal path going from origin (0,0) to (length, 0).
// Widest near 35-45% of length, tapering to a point at the tip.
function lilyPetalPath(length: number, width: number): string {
  return [
    `M 0 0`,
    `C ${length * 0.2} ${-width}, ${length * 0.7} ${-width * 0.7}, ${length} 0`,
    `C ${length * 0.7} ${width * 0.7}, ${length * 0.2} ${width}, 0 0`,
    `Z`,
  ].join(" ");
}
