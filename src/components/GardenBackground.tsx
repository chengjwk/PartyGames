// Stylized garden scene that adapts to the active theme:
//   - Light theme → daytime: blue sky, sun, fluffy clouds, bright hills.
//   - Dark theme  → nighttime: deep navy sky, moon with subtle craters,
//                   scattered stars, muted hills, dimmed flowers.
//
// The BG is the primary atmospheric layer; theme drives its palette
// directly, so the UI text contrast just works (dark text on bright sky;
// light text on dark sky).

import { useTheme } from "../lib/theme";

// Less-pastel daytime palette. Saturated, garden-bright colors so
// the foreground flowers don't dissolve into the new punchier sky.
// Positions thinned out around x=150 (cherry tree) and x=1420
// (lotus pond) so the decorative elements have breathing room.
const DAY_FLOWERS: Array<{ x: number; y: number; color: string; scale: number }> = [
  { x: 360, y: 890, color: "#e84a91", scale: 1 },       // rose-pink
  { x: 480, y: 920, color: "#f5b400", scale: 1.05 },    // gold
  { x: 620, y: 895, color: "#a23eb8", scale: 0.95 },    // royal purple
  { x: 760, y: 925, color: "#e84a91", scale: 1.15 },    // rose-pink
  { x: 900, y: 890, color: "#f5b400", scale: 0.95 },    // gold
  { x: 1040, y: 920, color: "#ff6a36", scale: 1.05 },   // coral
  { x: 1180, y: 880, color: "#a23eb8", scale: 1 },      // royal purple
  { x: 1280, y: 925, color: "#d92646", scale: 0.95 },   // poppy red
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
                {/* Punchier night sky — deeper indigo at top, richer
                    purple-blue in the middle, more saturated green
                    haze near the horizon. */}
                <stop offset="0%" stopColor="#040716" />
                <stop offset="45%" stopColor="#0b1740" />
                <stop offset="78%" stopColor="#1c2a55" />
                <stop offset="100%" stopColor="#0e2e1c" />
              </>
            ) : (
              <>
                {/* Less-pastel daytime — saturated cerulean up top,
                    crisp aqua-cyan band, and an actual fresh-grass
                    green at the horizon line. */}
                <stop offset="0%" stopColor="#1d7fd1" />
                <stop offset="45%" stopColor="#48a8df" />
                <stop offset="72%" stopColor="#9ed1c8" />
                <stop offset="100%" stopColor="#76b04a" />
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

        {/* Distant rolling hills — deeper, more saturated greens
            than the previous pastel palette. */}
        <path
          d="M0,720 Q300,650 620,700 T1200,690 T1600,680 L1600,1000 L0,1000 Z"
          fill={isNight ? "#0e261c" : "#3f8a3a"}
          opacity={isNight ? 1 : 1}
        />
        {/* Mid hills */}
        <path
          d="M0,820 Q400,760 820,800 T1600,790 L1600,1000 L0,1000 Z"
          fill={isNight ? "#061410" : "#2f6a2c"}
        />
        {/* Front grass */}
        <path
          d="M0,920 Q200,895 460,920 T1000,910 T1600,920 L1600,1000 L0,1000 Z"
          fill={isNight ? "#030a05" : "#214f1c"}
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

        {/* Decorative environment additions — a cherry tree on the
            left and a lotus pond on the right. Render AFTER the
            grass blades so they sit in the foreground, but BEFORE
            the front flowers so the flowers still pop on top. */}
        <CherryTree x={150} groundY={948} isNight={isNight} />
        <LotusPond x={1420} groundY={948} isNight={isNight} />

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

// ────────────────────────────────────────────────────────────────
// Decorative environment additions
// ────────────────────────────────────────────────────────────────

// Cherry tree — trunk + a few main branches with clusters of small
// pink circles standing in for blossoms. Sized to sit on the
// ground line with the canopy reaching up into the mid-hill zone.
// Doesn't host a flower-picker slot yet (waiting on `CherryBlossomBold`
// to graduate from the design preview); pure backdrop for now.
function CherryTree({
  x,
  groundY,
  isNight,
}: {
  x: number;
  groundY: number;
  isNight: boolean;
}) {
  const trunkFill = isNight ? "#2a1a10" : "#5a3a1f";
  const trunkEdge = isNight ? "#1a0e08" : "#3a2410";
  const blossomFill = isNight ? "#6a3a4a" : "#f78cb0";
  const blossomEdge = isNight ? "#3a1a24" : "#c45a82";
  const blossomGlow = isNight ? "#8a4a5a" : "#ffc4d6";
  // Cluster of small pink circles centered on (cx, cy).
  const blossomClusters: Array<{ cx: number; cy: number; r: number }> = [
    { cx: 50, cy: -170, r: 40 },
    { cx: -45, cy: -185, r: 44 },
    { cx: 70, cy: -225, r: 36 },
    { cx: -25, cy: -245, r: 38 },
    { cx: 25, cy: -260, r: 34 },
    { cx: -65, cy: -230, r: 30 },
  ];
  return (
    <g transform={`translate(${x} ${groundY})`}>
      {/* Trunk — tapered with a slight S-curve. */}
      <path
        d="
          M -10 0
          C -8 -50 -12 -90 -8 -130
          C -4 -170 -2 -200 0 -230
          L 8 -230
          C 10 -200 12 -170 8 -130
          C 4 -90 8 -50 10 0
          Z
        "
        fill={trunkFill}
        stroke={trunkEdge}
        strokeWidth={1.5}
      />
      {/* Main branches — drawn as thick curves coming off the trunk. */}
      <path
        d="M 6 -160 Q 30 -180 55 -178"
        stroke={trunkFill}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -4 -175 Q -25 -190 -50 -188"
        stroke={trunkFill}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 8 -200 Q 35 -215 65 -228"
        stroke={trunkFill}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -4 -210 Q -25 -230 -45 -240"
        stroke={trunkFill}
        strokeWidth={4.5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 4 -225 Q 12 -245 18 -260"
        stroke={trunkFill}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Blossom clusters — overlapping small circles for a fluffy
          canopy. Each cluster is ~6-9 circles, lightly stippled. */}
      {blossomClusters.map((c, i) => (
        <Blossoms
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={blossomFill}
          edge={blossomEdge}
          glow={blossomGlow}
        />
      ))}
    </g>
  );
}

function Blossoms({
  cx,
  cy,
  r,
  fill,
  edge,
  glow,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  edge: string;
  glow: string;
}) {
  // Deterministic-looking spray of small circles inside (cx, cy, r).
  // We use a fixed offset table so blossom clusters don't reshuffle
  // every render.
  const offsets: Array<{ dx: number; dy: number; sr: number }> = [
    { dx: 0, dy: 0, sr: 0.6 },
    { dx: 0.45, dy: -0.2, sr: 0.5 },
    { dx: -0.4, dy: -0.15, sr: 0.55 },
    { dx: 0.2, dy: 0.4, sr: 0.45 },
    { dx: -0.3, dy: 0.35, sr: 0.5 },
    { dx: 0.5, dy: 0.25, sr: 0.4 },
    { dx: -0.5, dy: 0.1, sr: 0.4 },
    { dx: 0.1, dy: -0.5, sr: 0.45 },
    { dx: -0.15, dy: -0.4, sr: 0.4 },
  ];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {offsets.map((o, i) => (
        <circle
          key={i}
          cx={o.dx * r}
          cy={o.dy * r}
          r={o.sr * r}
          fill={fill}
          stroke={edge}
          strokeWidth={1.1}
          strokeOpacity={0.6}
        />
      ))}
      {/* A few highlight petals on top */}
      {offsets.slice(0, 4).map((o, i) => (
        <circle
          key={`hl-${i}`}
          cx={o.dx * r - r * 0.1}
          cy={o.dy * r - r * 0.1}
          r={o.sr * r * 0.45}
          fill={glow}
          opacity={0.7}
        />
      ))}
    </g>
  );
}

// Lotus pond — flattened water ellipse with a lily pad and a
// stylized lotus on top. Pure backdrop (no picker slot yet).
function LotusPond({
  x,
  groundY,
  isNight,
}: {
  x: number;
  groundY: number;
  isNight: boolean;
}) {
  const water = isNight ? "#16263e" : "#3a8acc";
  const waterEdge = isNight ? "#0a1424" : "#1f5d8e";
  const waterHighlight = isNight ? "#2a3a55" : "#9bd0ee";
  const pad = isNight ? "#1a3520" : "#3a7a36";
  const padEdge = isNight ? "#0a1810" : "#1c3a1c";
  const lotusPetal = isNight ? "#7a3a5a" : "#f7a8c4";
  const lotusEdge = isNight ? "#3a1a24" : "#b04c6e";
  const lotusGlow = isNight ? "#a45a78" : "#ffd0e0";
  const lotusCenter = isNight ? "#f4cd44" : "#f4cd44";
  return (
    <g transform={`translate(${x} ${groundY})`}>
      {/* Pond water — flat ellipse with a slight tonal rim */}
      <ellipse
        cx={0}
        cy={-6}
        rx={150}
        ry={28}
        fill={water}
        stroke={waterEdge}
        strokeWidth={2}
      />
      {/* Surface ripples — thin offset arcs for a touch of motion. */}
      <ellipse
        cx={-30}
        cy={-10}
        rx={56}
        ry={8}
        fill="none"
        stroke={waterHighlight}
        strokeWidth={1.4}
        opacity={0.65}
      />
      <ellipse
        cx={50}
        cy={-4}
        rx={42}
        ry={6}
        fill="none"
        stroke={waterHighlight}
        strokeWidth={1.4}
        opacity={0.55}
      />

      {/* Lily pad — green disc with a wedge notch cut out. */}
      <g transform="translate(48 -16)">
        <ellipse
          cx={0}
          cy={0}
          rx={46}
          ry={16}
          fill={pad}
          stroke={padEdge}
          strokeWidth={1.6}
        />
        {/* Notch — a small triangle suggesting the classic lily pad
            cut. */}
        <path
          d="M -10 -2 L -42 -10 L -42 8 Z"
          fill={water}
          stroke={padEdge}
          strokeWidth={1.4}
        />
      </g>

      {/* Lotus bloom — stylized side-3/4 view with 5 pointed petals
          fanning upward from the water surface. */}
      <g transform="translate(-40 -22)">
        {/* Back-row tall petals */}
        <LotusPetal
          x={0}
          y={0}
          length={42}
          width={18}
          angleDeg={-90}
          fill={lotusPetal}
          edge={lotusEdge}
          glow={lotusGlow}
        />
        <LotusPetal
          x={0}
          y={0}
          length={38}
          width={16}
          angleDeg={-115}
          fill={lotusPetal}
          edge={lotusEdge}
          glow={lotusGlow}
        />
        <LotusPetal
          x={0}
          y={0}
          length={38}
          width={16}
          angleDeg={-65}
          fill={lotusPetal}
          edge={lotusEdge}
          glow={lotusGlow}
        />
        {/* Front-row wide petals — slightly drooping outward */}
        <LotusPetal
          x={0}
          y={0}
          length={30}
          width={20}
          angleDeg={-145}
          fill={lotusPetal}
          edge={lotusEdge}
          glow={lotusGlow}
        />
        <LotusPetal
          x={0}
          y={0}
          length={30}
          width={20}
          angleDeg={-35}
          fill={lotusPetal}
          edge={lotusEdge}
          glow={lotusGlow}
        />
        {/* Center — small yellow disc */}
        <circle
          cx={0}
          cy={-4}
          r={6}
          fill={lotusCenter}
          stroke={lotusEdge}
          strokeWidth={1.3}
        />
      </g>
    </g>
  );
}

function LotusPetal({
  x,
  y,
  length,
  width,
  angleDeg,
  fill,
  edge,
  glow,
}: {
  x: number;
  y: number;
  length: number;
  width: number;
  angleDeg: number;
  fill: string;
  edge: string;
  glow: string;
}) {
  // Pointed teardrop from base (0,0) to tip (length,0).
  const d = `
    M 0 0
    Q ${length * 0.4} ${-width * 0.55} ${length} 0
    Q ${length * 0.4} ${width * 0.55} 0 0
    Z
  `;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angleDeg})`}>
      <path
        d={d}
        fill={fill}
        stroke={edge}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* Soft highlight near the tip */}
      <ellipse
        cx={length * 0.62}
        cy={-width * 0.12}
        rx={length * 0.16}
        ry={width * 0.18}
        fill={glow}
        opacity={0.65}
      />
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
