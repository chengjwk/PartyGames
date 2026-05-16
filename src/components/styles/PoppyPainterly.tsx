// Poppy × Painterly — five crinkled petals around a dark seed pod
// with stamen dots. Petals carry a radial gradient (rich near the
// pod, lighter at the rim). Thin soft outlines for the watercolor
// feel; stamen dots stay dark so the pod still anchors the bloom.

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

export default function PoppyPainterly({
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
  const STEM_W = 5 * scale;
  const LEAF_LEN = 62 * scale;
  const STROKE = 1.3 * scale;

  const W = (PETAL_OFFSET + PETAL_R + 18) * 2;
  const H = stemLength + PETAL_OFFSET + PETAL_R + 24;

  const sway = swayKeyframes
    ? `${swayKeyframes} 4.5s ease-in-out infinite${bloomIn ? ", lily-bloom 0.55s ease-out" : ""}`
    : bloomIn
      ? "lily-bloom 0.55s ease-out"
      : undefined;

  const gradId = `poppy-grad-${petalColor.replace(/[^a-z0-9]/gi, "")}`;

  // Crinkled petal path — same scalloped circle as the bold poppy.
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
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={petalColor} stopOpacity="1" />
          <stop offset="55%" stopColor={petalColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={petalColor} stopOpacity="0.65" />
        </radialGradient>
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
      <ellipse
        cx={6 * scale}
        cy={-stemLength * 0.55}
        rx={LEAF_LEN * 0.2}
        ry={LEAF_LEN * 0.34}
        fill="#345e30"
        stroke="#1c3a1c"
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
                fill={`url(#${gradId})`}
                stroke={petalEdge}
                strokeWidth={STROKE}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              {/* Soft inner highlight */}
              <ellipse
                cx={-PETAL_R * 0.28}
                cy={-PETAL_R * 0.3}
                rx={PETAL_R * 0.3}
                ry={PETAL_R * 0.22}
                fill="rgba(255,255,255,0.28)"
                transform={`rotate(-25 ${-PETAL_R * 0.28} ${-PETAL_R * 0.3})`}
              />
            </g>
          );
        })}
        {/* Seed pod — keep dark so the poppy still has its trademark
            stark center contrast even in painterly. */}
        <circle cx={0} cy={0} r={CENTER_R + STROKE * 1.4} fill="#0e0a04" />
        <circle cx={0} cy={0} r={CENTER_R} fill="#1f1208" />
        {/* Stamen dots radiating out */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((Math.PI * 2) / 10) * i;
          const r = CENTER_R + 6 * scale;
          return (
            <circle
              key={i}
              cx={Math.cos(a) * r}
              cy={Math.sin(a) * r}
              r={1.5 * scale}
              fill="#1a0e04"
            />
          );
        })}
        <g transform={`translate(0 ${CENTER_R * 0.18})`}>{centerContent}</g>
      </g>
    </svg>
  );
}
