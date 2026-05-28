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
const DAY_FLOWERS: Array<{ x: number; y: number; color: string; scale: number }> = [
  { x: 80, y: 870, color: "#e84a91", scale: 1 },        // rose-pink
  { x: 220, y: 920, color: "#f5b400", scale: 1.1 },     // gold
  { x: 410, y: 880, color: "#a23eb8", scale: 0.9 },     // royal purple
  { x: 560, y: 930, color: "#e84a91", scale: 1.2 },     // rose-pink
  { x: 760, y: 890, color: "#f5b400", scale: 0.95 },    // gold
  { x: 940, y: 920, color: "#ff6a36", scale: 1.05 },    // coral
  { x: 1140, y: 880, color: "#a23eb8", scale: 1 },      // royal purple
  { x: 1320, y: 925, color: "#f5b400", scale: 1.15 },   // gold
  { x: 1480, y: 895, color: "#d92646", scale: 0.95 },   // poppy red
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

// `simple` = sky + hills + grass + flowers (no extra ornaments).
// `lush`   = simple + cherry blossom trees + pond + duck + bushes.
// Default is simple so any page that ALSO renders a GardenPicker
// (lobby + game pages) doesn't end up with a duplicate tree/pond
// fighting the picker for attention. Home opts in to lush for the
// fuller-garden feel.
type GardenVariant = "simple" | "lush";

export default function GardenBackground({
  variant = "simple",
}: {
  variant?: GardenVariant;
} = {}) {
  const [theme] = useTheme();
  const isNight = theme === "dark";
  const flowers = isNight ? NIGHT_FLOWERS : DAY_FLOWERS;
  const lush = variant === "lush";

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

        {/* Lush ornaments — only on pages that opt in via
            variant="lush" (Home today). On the lobby + game pages
            the GardenPicker is the visual centerpiece, so we keep
            the BG simple to avoid a duplicate tree / pond.
            x positions are clamped to ~500..1100 so they stay inside
            the central band that survives `xMidYMid slice` cropping
            on a portrait phone. */}
        {lush && (
          <>
            {BUSHES.map((b, i) => (
              <Bush key={i} x={b.x} y={b.y} scale={b.scale} isNight={isNight} />
            ))}
            {/* Foreground cherry tree — centered enough to be visible
                on phone, large enough to anchor the scene. */}
            <CherryTree x={520} y={835} scale={1.15} isNight={isNight} />
            {/* Background cherry tree on the right for depth. Same
                solid palette as the foreground one — no fade — so it
                reads as a painted second tree rather than a ghost. */}
            <CherryTree x={1080} y={790} scale={0.85} isNight={isNight} />
            {/* Pond with the floating duck, slightly off-center so
                the pond doesn't sit dead under the foreground tree. */}
            <Pond cx={830} cy={940} rx={210} ry={36} isNight={isNight} />
            <Duck baseX={770} baseY={928} isNight={isNight} />
          </>
        )}

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

// Lightly scattered bushes — small ellipse clusters with a darker
// outline rim. Three-circle cluster reads as a single bush from
// distance.
// Bushes tucked into the centrally-visible x band (~500..1100) so
// portrait phones don't crop them at the edges. Two on each side of
// the foreground cherry tree.
const BUSHES: Array<{ x: number; y: number; scale: number }> = [
  { x: 600, y: 935, scale: 1.0 },
  { x: 720, y: 942, scale: 0.7 },
  { x: 980, y: 938, scale: 0.85 },
  { x: 1050, y: 930, scale: 0.9 },
];

function Bush({
  x,
  y,
  scale,
  isNight,
}: {
  x: number;
  y: number;
  scale: number;
  isNight: boolean;
}) {
  const body = isNight ? "#0e2218" : "#2f6a2c";
  const hi = isNight ? "#13301f" : "#3f8a3a";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={-22} cy={0} rx={26} ry={16} fill={body} />
      <ellipse cx={20} cy={2} rx={28} ry={18} fill={body} />
      <ellipse cx={0} cy={-10} rx={32} ry={20} fill={body} />
      {/* Top highlight to suggest sun-side lighting — fully opaque so
          the bush reads as a solid silhouette rather than a wash. */}
      <ellipse cx={-4} cy={-15} rx={14} ry={6} fill={hi} />
    </g>
  );
}

// Cherry blossom tree — chunky brown S-curved trunk, two main forks,
// and a few pink blossom clusters. Aimed for "reads as a tree at a
// glance" rather than botanical accuracy; matches the painterly
// CherryTreePainterly used in the picker without sharing code (this
// one renders smaller + slightly stylized for the BG).
function CherryTree({
  x,
  y,
  scale,
  isNight,
}: {
  x: number;
  y: number;
  scale: number;
  isNight: boolean;
}) {
  const trunk = isNight ? "#1a1108" : "#5a3a1f";
  const trunkEdge = isNight ? "#0a0604" : "#2a1810";
  // Saturated, fully opaque palette — earlier versions used a faded
  // ghost variant that read as translucent. We want these blossoms
  // to look painted into the background, so the colors are crisp.
  const blossom = isNight ? "#7a3a5a" : "#f293b4";
  const blossomEdge = isNight ? "#1a0a10" : "#8a2e4a";
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Trunk + main fork — single tapered path so the silhouette
          reads cleanly. Coordinates origin at the base, growing up. */}
      <path
        d="
          M -8 0
          C -12 -40, -6 -80, -14 -130
          C -18 -160, -8 -180, -2 -190
          L 2 -190
          C 8 -180, 18 -160, 14 -130
          C 6 -80, 12 -40, 8 0
          Z
        "
        fill={trunk}
        stroke={trunkEdge}
        strokeWidth={1.5}
      />
      {/* Side branches reaching up into the canopy. */}
      <path
        d="M 0 -150 C -25 -170, -55 -185, -75 -210"
        stroke={trunk}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 0 -140 C 25 -160, 55 -180, 80 -200"
        stroke={trunk}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 0 -180 C 5 -200, 0 -225, -10 -240"
        stroke={trunk}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Blossom clusters — clusters of overlapping circles read as
          fluffy cherry blossom canopy from distance. */}
      <BlossomCluster cx={-80} cy={-215} r={42} color={blossom} edge={blossomEdge} />
      <BlossomCluster cx={-30} cy={-230} r={48} color={blossom} edge={blossomEdge} />
      <BlossomCluster cx={20} cy={-235} r={50} color={blossom} edge={blossomEdge} />
      <BlossomCluster cx={75} cy={-215} r={44} color={blossom} edge={blossomEdge} />
      <BlossomCluster cx={-12} cy={-260} r={36} color={blossom} edge={blossomEdge} />
    </g>
  );
}

function BlossomCluster({
  cx,
  cy,
  r,
  color,
  edge,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  edge: string;
}) {
  const blobs: Array<{ dx: number; dy: number; sr: number }> = [
    { dx: 0, dy: 0, sr: 0.55 },
    { dx: 0.4, dy: -0.2, sr: 0.45 },
    { dx: -0.4, dy: -0.15, sr: 0.45 },
    { dx: 0.25, dy: 0.35, sr: 0.4 },
    { dx: -0.3, dy: 0.3, sr: 0.42 },
    { dx: 0.1, dy: -0.45, sr: 0.4 },
  ];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {blobs.map((b, i) => (
        <circle
          key={i}
          cx={b.dx * r}
          cy={b.dy * r}
          r={b.sr * r}
          fill={color}
          stroke={edge}
          strokeWidth={1.2}
          strokeOpacity={0.7}
        />
      ))}
    </g>
  );
}

// Pond — flattened ellipse with horizontal sheen ripples and a few
// lily pads. Sits flush with the front grass line; the front grass
// blades visually overlap it at the edges for a more integrated look.
function Pond({
  cx,
  cy,
  rx,
  ry,
  isNight,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  isNight: boolean;
}) {
  const water = isNight ? "#0a1830" : "#3c7fb0";
  const waterEdge = isNight ? "#020812" : "#1d5a86";
  const sheen = isNight ? "#1a2f55" : "#9bd4ee";
  const padBody = isNight ? "#0d1a10" : "#2f6a2c";
  const padHi = isNight ? "#15281a" : "#4a8a3a";
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={water}
        stroke={waterEdge}
        strokeWidth={1.5}
      />
      {/* A pair of horizontal sheen ripples to read as still water. */}
      <ellipse
        cx={cx - 30}
        cy={cy - 6}
        rx={rx * 0.55}
        ry={1.6}
        fill={sheen}
        opacity={0.55}
      />
      <ellipse
        cx={cx + 50}
        cy={cy + 4}
        rx={rx * 0.35}
        ry={1.4}
        fill={sheen}
        opacity={0.45}
      />
      {/* Two lily pads — small dark green ellipses with a notch. */}
      <LilyPad x={cx - 130} y={cy + 6} scale={1} body={padBody} hi={padHi} />
      <LilyPad x={cx + 120} y={cy - 4} scale={0.85} body={padBody} hi={padHi} />
    </g>
  );
}

function LilyPad({
  x,
  y,
  scale,
  body,
  hi,
}: {
  x: number;
  y: number;
  scale: number;
  body: string;
  hi: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={0} rx={22} ry={8} fill={body} />
      <path
        d="M 0 0 L 10 -3 L 10 3 Z"
        fill="#000"
        opacity={0.35}
      />
      <ellipse cx={-4} cy={-2} rx={10} ry={2.5} fill={hi} opacity={0.7} />
    </g>
  );
}

// Duck — small SVG that drifts horizontally across the pond and
// bobs gently. Pure CSS animation; no rAF. We position absolutely
// over the pond's coordinate space using SVG transforms + keyframes.
function Duck({
  baseX,
  baseY,
  isNight,
}: {
  baseX: number;
  baseY: number;
  isNight: boolean;
}) {
  // Dimmer night palette so the duck doesn't glow against dark water.
  const body = isNight ? "#3a3528" : "#ffffff";
  const wing = isNight ? "#2a2620" : "#e9e3d0";
  const beak = isNight ? "#7a5a14" : "#f5a623";
  const eye = isNight ? "#080808" : "#1a1a1f";
  return (
    <g>
      <style>{`
        @keyframes gb-duck-drift {
          0%   { transform: translate(0, 0); }
          50%  { transform: translate(170px, 0); }
          100% { transform: translate(0, 0); }
        }
        @keyframes gb-duck-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
      `}</style>
      <g
        transform={`translate(${baseX} ${baseY})`}
        style={{
          animation: "gb-duck-drift 18s ease-in-out infinite",
          transformBox: "fill-box",
        }}
      >
        <g
          style={{
            animation: "gb-duck-bob 2.4s ease-in-out infinite",
            transformBox: "fill-box",
          }}
        >
          {/* Body */}
          <ellipse cx={0} cy={0} rx={22} ry={10} fill={body} stroke={eye} strokeWidth={1} />
          {/* Tail tip */}
          <path
            d="M -22 -2 L -32 -8 L -22 2 Z"
            fill={body}
            stroke={eye}
            strokeWidth={1}
          />
          {/* Wing detail */}
          <ellipse cx={-4} cy={-2} rx={12} ry={5} fill={wing} />
          {/* Neck + head */}
          <path
            d="M 16 -2 Q 22 -16 26 -16 Q 32 -16 32 -10 Q 32 -3 26 -2 Z"
            fill={body}
            stroke={eye}
            strokeWidth={1}
          />
          {/* Beak */}
          <path
            d="M 30 -10 L 38 -8 L 30 -6 Z"
            fill={beak}
            stroke={eye}
            strokeWidth={0.6}
          />
          {/* Eye */}
          <circle cx={27} cy={-12} r={1.3} fill={eye} />
        </g>
      </g>
    </g>
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
