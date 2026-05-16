// Stylized garden scene rendered behind the host display. Bright daytime
// palette — blue sky, fluffy clouds, sun high in the sky, vibrant green
// hills, scattered wildflowers along a grass line. SVG only, no images.
// A faint dark overlay keeps the dark UI cards above readable.

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

const CLOUDS: Array<{ x: number; y: number; scale: number }> = [
  { x: 220, y: 180, scale: 1.0 },
  { x: 620, y: 130, scale: 0.85 },
  { x: 1080, y: 220, scale: 1.15 },
  { x: 1450, y: 160, scale: 0.7 },
];

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
          {/* Daytime sky — clear blue at zenith fading toward a pale
              greenish horizon where it meets the hills. */}
          <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ea6e2" />
            <stop offset="45%" stopColor="#8fc7e8" />
            <stop offset="72%" stopColor="#cfe6e2" />
            <stop offset="100%" stopColor="#aac88a" />
          </linearGradient>
          <radialGradient id="garden-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8d4" stopOpacity="1" />
            <stop offset="55%" stopColor="#ffe48a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffe48a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1600" height="1000" fill="url(#garden-sky)" />

        {/* Sun high in the sky */}
        <circle cx="1280" cy="200" r="260" fill="url(#garden-sun)" />
        <circle cx="1280" cy="200" r="62" fill="#fff4b0" opacity="0.95" />

        {/* Fluffy daytime clouds */}
        {CLOUDS.map((c, i) => (
          <Cloud key={i} x={c.x} y={c.y} scale={c.scale} />
        ))}

        {/* Distant rolling hills */}
        <path
          d="M0,720 Q300,650 620,700 T1200,690 T1600,680 L1600,1000 L0,1000 Z"
          fill="#6a9c5e"
          opacity="0.9"
        />
        {/* Mid hills */}
        <path
          d="M0,820 Q400,760 820,800 T1600,790 L1600,1000 L0,1000 Z"
          fill="#4f8344"
        />
        {/* Front grass */}
        <path
          d="M0,920 Q200,895 460,920 T1000,910 T1600,920 L1600,1000 L0,1000 Z"
          fill="#3a6a32"
        />

        {/* Grass blades silhouetted */}
        {GRASS_BLADES.map((g, i) => (
          <path
            key={i}
            d={`M${g.x},${g.y} q-2,-${g.h * 0.4} 0,-${g.h} q3,${g.h * 0.4} 0,${g.h} z`}
            fill="#4a7c40"
            opacity="0.85"
          />
        ))}

        {/* Flowers in front */}
        {FLOWERS.map((f, i) => (
          <Flower key={i} x={f.x} y={f.y} color={f.color} scale={f.scale} />
        ))}
      </svg>
      {/* Theme-aware vignette layer. Opacity is driven by --bg-vignette
          (CSS var that changes with the data-theme attribute): heavy
          on dark theme so light text stays readable on the bright sky,
          near zero on light theme. */}
      <div className="bg-vignette" />
    </div>
  );
}

function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.9}>
      <ellipse cx={0} cy={0} rx={62} ry={20} fill="#ffffff" />
      <ellipse cx={-32} cy={-10} rx={28} ry={18} fill="#ffffff" />
      <ellipse cx={28} cy={-12} rx={32} ry={20} fill="#ffffff" />
      <ellipse cx={4} cy={-22} rx={24} ry={15} fill="#ffffff" />
      <ellipse cx={50} cy={-4} rx={22} ry={14} fill="#ffffff" />
    </g>
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
