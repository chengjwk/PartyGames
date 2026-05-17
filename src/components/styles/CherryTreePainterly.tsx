// Cherry Tree × Painterly — a full small tree (trunk, branches,
// multiple blossom clusters) sized to anchor a corner of the lobby
// picker garden. Blossom palette painterly — radial gradient on
// each petal cluster + soft inner highlight + low-opacity outline.
//
// Used as the MathHive picker entry in the new spatial-lobby
// layout. Tappable as a single unit.

import type { ReactNode } from "react";

interface Props {
  // Picker uses this as the "bloom color" — applied to the blossom
  // clusters. Trunk + branch color stays a warm brown regardless.
  petalColor: string;
  petalEdge: string;
  centerContent: ReactNode;
  // Overall height in SVG units. The tree silhouette will scale to
  // fit. Bumped vs other flower types because trees are big.
  stemLength: number;
  scale?: number;
  swayKeyframes?: string;
  bloomIn?: boolean;
}

export default function CherryTreePainterly({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const TRUNK_W = 14 * scale;
  const CENTER_R = 14 * scale;

  // Width is broad — cherry trees fan out.
  const W = 280 * scale;
  const H = stemLength + 40 * scale;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const blossomGradId = `cherry-tree-blossom-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

  // Trunk: tapered S-curve from ground to about 60% of the height.
  const trunkTopY = -stemLength * 0.55;
  const trunkPath = `
    M ${-TRUNK_W / 2} 0
    C ${-TRUNK_W / 2 - 2} ${stemLength * -0.2}, ${-TRUNK_W / 2 + 4} ${stemLength * -0.35}, ${-TRUNK_W / 3} ${trunkTopY}
    L ${TRUNK_W / 3} ${trunkTopY}
    C ${TRUNK_W / 2 - 4} ${stemLength * -0.35}, ${TRUNK_W / 2 + 2} ${stemLength * -0.2}, ${TRUNK_W / 2} 0
    Z
  `;

  // Blossom clusters: position relative to the canopy origin
  // (translate to (0, trunkTopY)). Each cluster gets its own bezier
  // branch from the trunk top.
  const clusters: Array<{
    branchEndX: number;
    branchEndY: number;
    clusterR: number;
    branchControl: { cx: number; cy: number };
  }> = [
    { branchEndX: -90, branchEndY: -30, clusterR: 56, branchControl: { cx: -50, cy: -30 } },
    { branchEndX: -50, branchEndY: -110, clusterR: 52, branchControl: { cx: -20, cy: -60 } },
    { branchEndX: 30, branchEndY: -130, clusterR: 60, branchControl: { cx: 20, cy: -80 } },
    { branchEndX: 95, branchEndY: -70, clusterR: 54, branchControl: { cx: 50, cy: -40 } },
    { branchEndX: 75, branchEndY: -160, clusterR: 44, branchControl: { cx: 40, cy: -110 } },
  ];

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
        <radialGradient id={blossomGradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={petalColor} stopOpacity="1" />
          <stop offset="55%" stopColor={petalColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.6" />
        </radialGradient>
      </defs>

      {/* Trunk */}
      <path
        d={trunkPath}
        fill="#5a3a1f"
        stroke="#2a1810"
        strokeWidth={1.6 * scale}
      />
      {/* Subtle trunk shading line down the middle */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={trunkTopY * 0.95}
        stroke="#3a2410"
        strokeWidth={1.4 * scale}
        opacity={0.5}
      />

      {/* Branches — each goes from canopy origin out to its cluster */}
      <g transform={`translate(0 ${trunkTopY})`}>
        {clusters.map((c, i) => (
          <path
            key={`b-${i}`}
            d={`M 0 0 Q ${c.branchControl.cx * scale} ${c.branchControl.cy * scale} ${c.branchEndX * scale} ${c.branchEndY * scale}`}
            stroke="#5a3a1f"
            strokeWidth={5 * scale - i * 0.3 * scale}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* Blossom clusters */}
        {clusters.map((c, i) => (
          <BlossomBunch
            key={`c-${i}`}
            cx={c.branchEndX * scale}
            cy={c.branchEndY * scale}
            r={c.clusterR * scale}
            fill={`url(#${blossomGradId})`}
            edge={petalEdge}
          />
        ))}

        {/* Center bloom (where the emoji slot lives) — overlays the
            middle of the canopy. Slightly larger so the emoji has
            breathing room. */}
        <g transform={`translate(0 ${-70 * scale})`}>
          <BlossomFlower r={CENTER_R * 2} fill={`url(#${blossomGradId})`} edge={petalEdge} />
          <circle
            cx={0}
            cy={0}
            r={CENTER_R}
            fill="#f4cd44"
            stroke="#3a2a14"
            strokeWidth={1.4 * scale}
            strokeOpacity={0.7}
          />
          <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
        </g>
      </g>
    </svg>
  );
}

// A cluster of overlapping small blossom flowers — gives the
// canopy its characteristic fluffy look.
function BlossomBunch({
  cx,
  cy,
  r,
  fill,
  edge,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  edge: string;
}) {
  const offsets: Array<{ dx: number; dy: number; sr: number }> = [
    { dx: 0, dy: 0, sr: 0.55 },
    { dx: 0.42, dy: -0.15, sr: 0.42 },
    { dx: -0.4, dy: -0.18, sr: 0.45 },
    { dx: 0.25, dy: 0.38, sr: 0.4 },
    { dx: -0.3, dy: 0.32, sr: 0.42 },
    { dx: 0.12, dy: -0.5, sr: 0.4 },
    { dx: -0.15, dy: -0.45, sr: 0.35 },
    { dx: 0.5, dy: 0.2, sr: 0.35 },
  ];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {offsets.map((o, i) => (
        <BlossomFlower
          key={i}
          cx={o.dx * r}
          cy={o.dy * r}
          r={o.sr * r}
          fill={fill}
          edge={edge}
        />
      ))}
    </g>
  );
}

// A single small 5-petal blossom — drawn as overlapping circles
// for performance (vs proper notched-petal SVG paths). Reads as
// "cherry blossom" from picker distance.
function BlossomFlower({
  cx = 0,
  cy = 0,
  r,
  fill,
  edge,
}: {
  cx?: number;
  cy?: number;
  r: number;
  fill: string;
  edge: string;
}) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={Math.cos(a) * r * 0.55}
            cy={Math.sin(a) * r * 0.55}
            r={r * 0.55}
            fill={fill}
            stroke={edge}
            strokeWidth={1.1}
            strokeOpacity={0.5}
          />
        );
      })}
      <circle cx={0} cy={0} r={r * 0.18} fill="#f4cd44" opacity={0.85} />
    </g>
  );
}
