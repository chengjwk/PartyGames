// Stylized garden scene rendered behind the host display. Muted palette so the
// dark UI cards above stay readable. SVG only, no images.

const FLOWERS: Array<{ x: number; y: number; color: string; scale: number }> = [
  { x: 80, y: 870, color: "#f8b8d0", scale: 1 },
  { x: 220, y: 920, color: "#f7d56e", scale: 1.1 },
  { x: 410, y: 880, color: "#dca0e6", scale: 0.9 },
  { x: 560, y: 930, color: "#f8b8d0", scale: 1.2 },
  { x: 760, y: 890, color: "#f7d56e", scale: 0.95 },
  { x: 940, y: 920, color: "#ffae8a", scale: 1.05 },
  { x: 1140, y: 880, color: "#dca0e6", scale: 1 },
  { x: 1320, y: 925, color: "#f7d56e", scale: 1.15 },
  { x: 1480, y: 895, color: "#f8b8d0", scale: 0.95 },
];

const GRASS_BLADES: Array<{ x: number; y: number; h: number }> = Array.from(
  { length: 30 },
  (_, i) => ({
    x: 40 + i * 53 + (i % 2) * 18,
    y: 940,
    h: 18 + ((i * 7) % 10),
  }),
);

export default function GardenBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1600 1000"
      >
        <defs>
          <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f2730" />
            <stop offset="55%" stopColor="#2c3a45" />
            <stop offset="78%" stopColor="#5a5a3e" />
            <stop offset="100%" stopColor="#3d4f2c" />
          </linearGradient>
          <radialGradient id="garden-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe6a8" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#f4b063" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f4b063" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1600" height="1000" fill="url(#garden-sky)" />

        {/* Sun glow on the horizon */}
        <circle cx="1280" cy="640" r="240" fill="url(#garden-sun)" />
        <circle cx="1280" cy="640" r="60" fill="#ffd17a" opacity="0.7" />

        {/* Distant rolling hills */}
        <path
          d="M0,720 Q300,650 620,700 T1200,690 T1600,680 L1600,1000 L0,1000 Z"
          fill="#2f4a32"
          opacity="0.85"
        />
        {/* Mid hills */}
        <path
          d="M0,820 Q400,760 820,800 T1600,790 L1600,1000 L0,1000 Z"
          fill="#274428"
        />
        {/* Front grass */}
        <path
          d="M0,920 Q200,895 460,920 T1000,910 T1600,920 L1600,1000 L0,1000 Z"
          fill="#1b3a1b"
        />

        {/* Grass blades silhouetted */}
        {GRASS_BLADES.map((g, i) => (
          <path
            key={i}
            d={`M${g.x},${g.y} q-2,-${g.h * 0.4} 0,-${g.h} q3,${g.h * 0.4} 0,${g.h} z`}
            fill="#2a4a2a"
            opacity="0.7"
          />
        ))}

        {/* Flowers in front */}
        {FLOWERS.map((f, i) => (
          <Flower key={i} x={f.x} y={f.y} color={f.color} scale={f.scale} />
        ))}

        {/* Soft vignette so the UI cards stay readable */}
        <rect
          width="1600"
          height="1000"
          fill="black"
          opacity="0.18"
        />
      </svg>
    </div>
  );
}

function Flower({
  x,
  y,
  color,
  scale,
}: {
  x: number;
  y: number;
  color: string;
  scale: number;
}) {
  const r = 12;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <line x1={0} y1={0} x2={0} y2={-46} stroke="#244022" strokeWidth={3} />
      <ellipse cx={5} cy={-30} rx={6} ry={3} fill="#345e30" transform="rotate(35 5 -30)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={r * Math.cos(a)}
            cy={r * Math.sin(a) - 56}
            r={r}
            fill={color}
            opacity={0.92}
          />
        );
      })}
      <circle cx={0} cy={-56} r={6} fill="#f4cd44" />
    </g>
  );
}
