// Stylized garden scene that adapts to the active theme:
//   - Light theme → daytime: blue sky, sun, fluffy clouds, bright hills.
//   - Dark theme  → nighttime: deep navy sky, moon with subtle craters,
//                   scattered stars, muted hills, dimmed flowers.
//
// The BG is the primary atmospheric layer; theme drives its palette
// directly, so the UI text contrast just works (dark text on bright sky;
// light text on dark sky).

import { useTheme } from "../lib/theme";

const DAY_FLOWERS: Array<{ x: number; y: number; color: string; scale: number }> = [
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

// At night flowers read as muted silhouettes washed in moonlight.
const NIGHT_FLOWERS = DAY_FLOWERS.map((f) => ({ ...f, color: nightTint(f.color) }));

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

// Deterministic pseudo-random scatter of stars in the upper 60% of the
// sky. IIFE so the array is built once at module load — re-renders keep
// the same star positions.
const STARS: Array<{ x: number; y: number; r: number; o: number }> = (() => {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let s = 12345;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 55; i++) {
    out.push({
      x: rand() * 1580 + 10,
      y: rand() * 560 + 20,
      r: 0.9 + rand() * 1.3,
      o: 0.35 + rand() * 0.55,
    });
  }
  return out;
})();

export default function GardenBackground() {
  const [theme] = useTheme();
  const isNight = theme === "dark";
  const flowers = isNight ? NIGHT_FLOWERS : DAY_FLOWERS;

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
            {isNight ? (
              <>
                <stop offset="0%" stopColor="#08101e" />
                <stop offset="45%" stopColor="#152040" />
                <stop offset="78%" stopColor="#243250" />
                <stop offset="100%" stopColor="#1e3a28" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#4ea6e2" />
                <stop offset="45%" stopColor="#8fc7e8" />
                <stop offset="72%" stopColor="#cfe6e2" />
                <stop offset="100%" stopColor="#aac88a" />
              </>
            )}
          </linearGradient>
          <radialGradient id="garden-luminary" cx="50%" cy="50%" r="50%">
            {isNight ? (
              <>
                <stop offset="0%" stopColor="#f4f1e0" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#a8b8e8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#a8b8e8" stopOpacity="0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fff8d4" stopOpacity="1" />
                <stop offset="55%" stopColor="#ffe48a" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ffe48a" stopOpacity="0" />
              </>
            )}
          </radialGradient>
        </defs>

        <rect width="1600" height="1000" fill="url(#garden-sky)" />

        {/* Stars — night only */}
        {isNight &&
          STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f4f1e0" opacity={s.o} />
          ))}

        {/* Soft glow halo around sun/moon */}
        <circle cx="1280" cy="200" r="260" fill="url(#garden-luminary)" />
        {/* Sun / Moon body */}
        <circle
          cx="1280"
          cy="200"
          r={isNight ? 56 : 62}
          fill={isNight ? "#f4f1e0" : "#fff4b0"}
          opacity={isNight ? 0.95 : 0.95}
        />
        {/* Moon craters — only at night */}
        {isNight && (
          <>
            <circle cx="1262" cy="194" r="7" fill="#a8a89a" opacity="0.4" />
            <circle cx="1297" cy="207" r="4.5" fill="#a8a89a" opacity="0.4" />
            <circle cx="1276" cy="221" r="5.5" fill="#a8a89a" opacity="0.4" />
            <circle cx="1305" cy="184" r="3" fill="#a8a89a" opacity="0.35" />
          </>
        )}

        {/* Clouds — daytime only */}
        {!isNight && CLOUDS.map((c, i) => <Cloud key={i} x={c.x} y={c.y} scale={c.scale} />)}

        {/* Distant rolling hills */}
        <path
          d="M0,720 Q300,650 620,700 T1200,690 T1600,680 L1600,1000 L0,1000 Z"
          fill={isNight ? "#1a3025" : "#6a9c5e"}
          opacity={isNight ? 1 : 0.9}
        />
        {/* Mid hills */}
        <path
          d="M0,820 Q400,760 820,800 T1600,790 L1600,1000 L0,1000 Z"
          fill={isNight ? "#0f2018" : "#4f8344"}
        />
        {/* Front grass */}
        <path
          d="M0,920 Q200,895 460,920 T1000,910 T1600,920 L1600,1000 L0,1000 Z"
          fill={isNight ? "#0a160e" : "#3a6a32"}
        />

        {/* Grass blades silhouetted */}
        {GRASS_BLADES.map((g, i) => (
          <path
            key={i}
            d={`M${g.x},${g.y} q-2,-${g.h * 0.4} 0,-${g.h} q3,${g.h * 0.4} 0,${g.h} z`}
            fill={isNight ? "#1a2818" : "#4a7c40"}
            opacity={isNight ? 0.7 : 0.85}
          />
        ))}

        {/* Flowers in front */}
        {flowers.map((f, i) => (
          <Flower key={i} x={f.x} y={f.y} color={f.color} scale={f.scale} />
        ))}
      </svg>
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
        const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
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

// Darken + slightly cool a daytime flower color for the nighttime palette.
function nightTint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r * 0.32);
  const ng = Math.round(g * 0.32);
  const nb = Math.min(255, Math.round(b * 0.32 + 24));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}
