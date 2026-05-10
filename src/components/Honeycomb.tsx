import { useEffect, useState } from "react";

interface HoneycombProps {
  letters: string[]; // [center, ...6 outer]
  onTap: (letter: string) => void;
  size?: number;
  bonusLetter?: string; // outer letter that scores 2x
  beeLetter?: string | null; // outer letter currently boosted by a bee (15s)
}

const HEX_RADIUS = 1;
const HEX_PATH = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i + Math.PI / 6;
  return `${Math.cos(angle).toFixed(4)},${Math.sin(angle).toFixed(4)}`;
}).join(" ");

const OUTER_OFFSETS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  const d = Math.sqrt(3);
  return [d * Math.cos(angle), d * Math.sin(angle)] as const;
});

export default function Honeycomb({ letters, onTap, size = 320, bonusLetter, beeLetter }: HoneycombProps) {
  const center = letters[0];
  const outer = letters.slice(1, 7);
  const extent = Math.sqrt(3) + HEX_RADIUS + 0.5;
  const topPad = 1.6;
  const vbX = -extent;
  const vbY = -extent - topPad;
  const vbW = extent * 2;
  const vbH = extent * 2 + topPad;
  const vb = `${vbX} ${vbY} ${vbW} ${vbH}`;
  const topOuter = OUTER_OFFSETS[0];

  // Keep the bee mounted while it animates out. `displayed` is the letter we
  // currently render; `exiting` plays the fly-out then unmounts.
  const [displayed, setDisplayed] = useState<string | null>(beeLetter ?? null);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (beeLetter && beeLetter !== displayed) {
      setDisplayed(beeLetter);
      setExiting(false);
    } else if (!beeLetter && displayed && !exiting) {
      setExiting(true);
      const t = setTimeout(() => {
        setDisplayed(null);
        setExiting(false);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [beeLetter, displayed, exiting]);

  return (
    <svg
      viewBox={vb}
      width={size}
      height={(size * vbH) / vbW}
      style={{ touchAction: "manipulation", userSelect: "none", overflow: "visible" }}
    >
      <style>{`
        @keyframes hc-bee-in {
          0%   { transform: translate(-3.5px, -3px) rotate(-25deg); opacity: 0; }
          30%  { opacity: 1; }
          60%  { transform: translate(0.3px, -0.1px) rotate(10deg); }
          100% { transform: translate(0, 0) rotate(0); opacity: 1; }
        }
        @keyframes hc-bee-out {
          0%   { transform: translate(0, 0) rotate(0); opacity: 1; }
          100% { transform: translate(4px, -3px) rotate(35deg); opacity: 0; }
        }
        @keyframes hc-bee-bob {
          0%,100% { transform: translate(0, 0); }
          50% { transform: translate(0, -0.06px); }
        }
      `}</style>
      <Hex cx={0} cy={0} letter={center} fill="var(--accent)" textFill="var(--accent-fg)" onTap={onTap} />
      {outer.map((letter, i) => {
        const [dx, dy] = OUTER_OFFSETS[i];
        const isBonus = bonusLetter === letter;
        return (
          <Hex
            key={`${letter}-${i}`}
            cx={dx}
            cy={dy}
            letter={letter}
            fill={isBonus ? "#3a3a18" : "var(--bg-elev)"}
            textFill="var(--fg)"
            badge={isBonus ? "2×" : null}
            onTap={onTap}
          />
        );
      })}
      {displayed && (
        <BeeLetter
          cx={topOuter[0]}
          cy={topOuter[1] - 1.55}
          letter={displayed}
          exiting={exiting}
          onTap={onTap}
        />
      )}
    </svg>
  );
}

interface HexProps {
  cx: number;
  cy: number;
  letter: string;
  fill: string;
  textFill: string;
  badge?: string | null;
  onTap: (letter: string) => void;
}

function Hex({ cx, cy, letter, fill, textFill, badge, onTap }: HexProps) {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g
        onPointerDown={(e) => {
          e.preventDefault();
          setPressed(true);
          onTap(letter);
          setTimeout(() => setPressed(false), 130);
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        style={{
          cursor: "pointer",
          transformOrigin: "center",
          transform: pressed ? "scale(0.88)" : "scale(1)",
          transition: "transform 100ms ease-out",
        }}
      >
        <polygon
          points={HEX_PATH}
          fill={fill}
          stroke={badge ? "var(--accent)" : "var(--border)"}
          strokeWidth={badge ? 0.06 : 0.04}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={0.9}
          fontWeight={800}
          fill={textFill}
          style={{ textTransform: "uppercase", pointerEvents: "none" }}
        >
          {letter.toUpperCase()}
        </text>
        {badge && (
          <text
            x={0.55}
            y={-0.55}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={0.32}
            fontWeight={700}
            fill="var(--accent)"
            style={{ pointerEvents: "none" }}
          >
            {badge}
          </text>
        )}
      </g>
    </g>
  );
}

// Bee carrying its letter — no hex container. The letter sits beside/below
// the bee emoji and the whole group flies in / bobs / flies out.
function BeeLetter({
  cx,
  cy,
  letter,
  exiting,
  onTap,
}: {
  cx: number;
  cy: number;
  letter: string;
  exiting: boolean;
  onTap: (letter: string) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  // Re-mount on letter change so the entrance animation replays.
  const [mountKey, setMountKey] = useState(0);
  useEffect(() => setMountKey((k) => k + 1), [letter]);

  const animation = exiting
    ? "hc-bee-out 0.65s ease-in forwards"
    : "hc-bee-in 0.7s ease-out, hc-bee-bob 1.6s ease-in-out 0.7s infinite";

  return (
    <g key={mountKey} transform={`translate(${cx} ${cy})`}>
      <g style={{ animation, transformOrigin: "center" }}>
        <g
          onPointerDown={(e) => {
            if (exiting) return;
            e.preventDefault();
            setPressed(true);
            onTap(letter);
            setTimeout(() => setPressed(false), 130);
          }}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          style={{
            cursor: exiting ? "default" : "pointer",
            transformOrigin: "center",
            transform: pressed ? "scale(0.88)" : "scale(1)",
            transition: "transform 100ms ease-out",
          }}
        >
          {/* Invisible hit rect — bee+letter glyphs alone have tiny hit areas. */}
          <rect
            x={-1.1}
            y={-0.8}
            width={2.2}
            height={1.6}
            fill="transparent"
            style={{ pointerEvents: "all" }}
          />
          {/* Flip the bee horizontally — emoji faces left by default and our
              entrance animation moves it rightward. */}
          <g transform="translate(-0.45 0) scale(-1 1)">
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={1.15}
              style={{ pointerEvents: "none" }}
            >
              🐝
            </text>
          </g>
          <text
            x={0.55}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={1.0}
            fontWeight={800}
            fill="var(--accent)"
            stroke="var(--accent-fg)"
            strokeWidth={0.04}
            paintOrder="stroke"
            style={{ textTransform: "uppercase", pointerEvents: "none" }}
          >
            {letter.toUpperCase()}
          </text>
        </g>
      </g>
    </g>
  );
}
