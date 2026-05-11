import { useEffect, useState } from "react";
import type { ActiveBee } from "../shared/types";

interface HoneycombProps {
  letters: string[]; // [center, ...6 outer]
  onTap: (letter: string) => void;
  size?: number;
  bonusLetter?: string; // classic only: outer letter that scores 2x
  bees?: ActiveBee[]; // active bees (mode-dependent rendering)
}

const HEX_RADIUS = 1;
// Flat-top hex: vertices at 0°, 60°, 120°, ... so the top + bottom are flat.
// Combined with outer-hex centers at 30°, 90°, 150°, ... at distance √3, the
// six neighbors share full edges with the center for a clean honeycomb.
const HEX_PATH = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i;
  return `${Math.cos(angle).toFixed(4)},${Math.sin(angle).toFixed(4)}`;
}).join(" ");

const OUTER_OFFSETS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  const d = Math.sqrt(3);
  return [d * Math.cos(angle), d * Math.sin(angle)] as const;
});

export default function Honeycomb({ letters, onTap, size = 320, bonusLetter, bees }: HoneycombProps) {
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

  const beesArr = bees ?? [];
  // Floating 8th-letter (classic only): slot === -1
  const floater = beesArr.find((b) => b.slot === -1) ?? null;
  // Swarm: bees on outer slots (1-6) or center (0, queen).
  const beeByOuterSlot = new Map<number, ActiveBee>();
  for (const b of beesArr) {
    if (b.slot >= 1 && b.slot <= 6) beeByOuterSlot.set(b.slot, b);
  }
  const queenBee = beesArr.find((b) => b.slot === 0) ?? null;

  // Mount-exit fade for the floating bee (classic mode).
  const [displayedFloat, setDisplayedFloat] = useState<string | null>(floater?.letter ?? null);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (floater && floater.letter !== displayedFloat) {
      setDisplayedFloat(floater.letter);
      setExiting(false);
    } else if (!floater && displayedFloat && !exiting) {
      setExiting(true);
      const t = setTimeout(() => {
        setDisplayedFloat(null);
        setExiting(false);
      }, 1350);
      return () => clearTimeout(t);
    }
  }, [floater, displayedFloat, exiting]);

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
        @keyframes hc-worker-in {
          0%   { transform: translate(var(--fx), var(--fy)) rotate(var(--fr)) scale(0.6); opacity: 0; }
          40%  { opacity: 1; }
          70%  { transform: translate(0.2px, -0.15px) rotate(8deg) scale(1.1); }
          100% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes hc-queen-in {
          0%   { transform: translate(0, -8px) scale(0.2); opacity: 0; }
          40%  { opacity: 1; }
          60%  { transform: translate(0, 0.2px) scale(1.2); }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes hc-swarm-bob {
          0%,100% { transform: translate(0, 0); }
          50% { transform: translate(0, -0.05px); }
        }
      `}</style>
      {queenBee ? (
        <Hex
          cx={0}
          cy={0}
          letter={queenBee.letter}
          fill="var(--accent)"
          textFill="var(--accent-fg)"
          badge="5×"
          badgeColor="#1a1a1f"
          beeOverlay="queen"
          onTap={onTap}
        />
      ) : (
        <Hex cx={0} cy={0} letter={center} fill="var(--accent)" textFill="var(--accent-fg)" onTap={onTap} />
      )}
      {outer.map((origLetter, i) => {
        const [dx, dy] = OUTER_OFFSETS[i];
        const bee = beeByOuterSlot.get(i + 1);
        if (bee) {
          return (
            <Hex
              key={`bee-${i}-${bee.letter}`}
              cx={dx}
              cy={dy}
              letter={bee.letter}
              fill="var(--accent)"
              textFill="var(--accent-fg)"
              badge={`${bee.multiplier}×`}
              badgeColor="#1a1a1f"
              beeOverlay="worker"
              onTap={onTap}
            />
          );
        }
        const isBonus = bonusLetter === origLetter;
        return (
          <Hex
            key={`${origLetter}-${i}`}
            cx={dx}
            cy={dy}
            letter={origLetter}
            fill={isBonus ? "#3a3a18" : "var(--bg-elev)"}
            textFill="var(--fg)"
            badge={isBonus ? "2×" : null}
            onTap={onTap}
          />
        );
      })}
      {displayedFloat && (
        <BeeLetter
          cx={topOuter[0]}
          cy={topOuter[1] - 1.55}
          letter={displayedFloat}
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
  badgeColor?: string; // override badge color (default = accent)
  beeOverlay?: "worker" | "queen" | null; // small bee icon in the corner
  onTap: (letter: string) => void;
}

function Hex({ cx, cy, letter, fill, textFill, badge, badgeColor, beeOverlay, onTap }: HexProps) {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  // Pick a random fly-in direction per mount so bees don't all enter from
  // the same corner — adds to the chaos.
  const flyFrom = beeOverlay ? randomCorner() : null;
  const animName = beeOverlay === "queen" ? "hc-queen-in" : "hc-worker-in";
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g
        style={
          beeOverlay
            ? {
                animation: `${animName} 0.55s cubic-bezier(.2,.7,.3,1.4), hc-swarm-bob 1.4s ease-in-out 0.55s infinite`,
                transformOrigin: "center",
                ...(flyFrom as React.CSSProperties),
              }
            : undefined
        }
      >
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
            fontWeight={800}
            fill={badgeColor ?? "var(--accent)"}
            style={{ pointerEvents: "none" }}
          >
            {badge}
          </text>
        )}
        {beeOverlay === "worker" && (
          <g transform="translate(-0.55 -0.55) scale(-1 1)">
            <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={0.4} style={{ pointerEvents: "none" }}>
              🐝
            </text>
          </g>
        )}
        {beeOverlay === "queen" && (
          <text x={-0.55} y={-0.55} textAnchor="middle" dominantBaseline="central" fontSize={0.4} style={{ pointerEvents: "none" }}>
            👑
          </text>
        )}
      </g>
      </g>
    </g>
  );
}

const CORNERS: ReadonlyArray<{ "--fx": string; "--fy": string; "--fr": string }> = [
  { "--fx": "-3.5px", "--fy": "-3px", "--fr": "-30deg" },
  { "--fx": "3.5px", "--fy": "-3px", "--fr": "30deg" },
  { "--fx": "-3.5px", "--fy": "3px", "--fr": "-25deg" },
  { "--fx": "3.5px", "--fy": "3px", "--fr": "25deg" },
];

function randomCorner() {
  return CORNERS[Math.floor(Math.random() * CORNERS.length)];
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
    ? "hc-bee-out 1.3s ease-in forwards"
    : "hc-bee-in 1.4s ease-out, hc-bee-bob 1.6s ease-in-out 1.4s infinite";

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
