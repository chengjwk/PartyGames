// Poppy × Bold Cartoon — five wide round crinkly petals, dark
// seed-pod center with stamen dots, thick dark outline. Reads as a
// bold, slightly papery poppy. Pairs well with saturated reds /
// oranges / pinks.

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

export default function PoppyBold({
  petalColor,
  petalEdge,
  centerContent,
  stemLength,
  scale = 1,
  swayKeyframes,
  bloomIn,
}: Props) {
  const PETAL_R = 26 * scale;
  const PETAL_OFFSET = 19 * scale;
  const CENTER_R = 14 * scale;
  const STEM_W = 6 * scale;
  const LEAF_LEN = 60 * scale;
  const STROKE = 2.4 * scale;

  const W = (PETAL_OFFSET + PETAL_R + 18) * 2;
  const H = stemLength + PETAL_OFFSET + PETAL_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  // Crinkled petal — a slightly scalloped circle to suggest the
  // papery edges poppies are known for. Drawn as a closed path of
  // alternating bezier curves around a circle.
  function crinklePath(r: number): string {
    const segs = 10;
    const pts: string[] = [];
    for (let i = 0; i < segs; i++) {
      const a = (Math.PI * 2 * i) / segs;
      const next = (Math.PI * 2 * (i + 1)) / segs;
      const mid = (a + next) / 2;
      const inner = r * (i % 2 === 0 ? 0.88 : 1);
      const outer = r;
      const x1 = Math.cos(a) * inner;
      const y1 = Math.sin(a) * inner;
      const cx = Math.cos(mid) * outer * 1.05;
      const cy = Math.sin(mid) * outer * 1.05;
      const x2 = Math.cos(next) * inner;
      const y2 = Math.sin(next) * inner;
      if (i === 0) pts.push(`M ${x1} ${y1}`);
      pts.push(`Q ${cx} ${cy} ${x2} ${y2}`);
    }
    pts.push("Z");
    return pts.join(" ");
  }

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
            <g key={i} transform={`translate(${cx} ${cy})`}>
              <path
                d={crinklePath(PETAL_R)}
                fill={petalColor}
                stroke={petalEdge}
                strokeWidth={STROKE}
                strokeLinejoin="round"
              />
              {/* Highlight crescent on each petal */}
              <ellipse
                cx={-PETAL_R * 0.3}
                cy={-PETAL_R * 0.35}
                rx={PETAL_R * 0.28}
                ry={PETAL_R * 0.18}
                fill="rgba(255,255,255,0.45)"
                transform={`rotate(-25 ${-PETAL_R * 0.3} ${-PETAL_R * 0.35})`}
              />
            </g>
          );
        })}
        {/* Seed pod center — dark dome with stamen dots radiating out. */}
        <circle
          cx={0}
          cy={0}
          r={CENTER_R + STROKE}
          fill="#0e0a04"
        />
        <circle cx={0} cy={0} r={CENTER_R} fill="#1f1208" />
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((Math.PI * 2) / 10) * i;
          const r = CENTER_R + 6 * scale;
          return (
            <circle
              key={i}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.6 * scale}
              fill="#1a0e04"
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
