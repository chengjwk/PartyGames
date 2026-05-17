// Spatial garden-picker layout for the pre-game lobby. The
// three games live as flora in a single scene rather than three
// cards in a 3-column grid:
//
//   - WordHive    → sunflower standing mid-right.
//   - MathHive    → cherry blossom tree on the upper-left.
//   - Pollinart   → lotus on a pond across the bottom.
//
// Each "flower" is a button (or a non-interactive shell if the
// viewer isn't the host yet). Layout adapts via the `compact`
// flag — phone picker uses a tighter portrait arrangement, the
// TV/host view uses a wider landscape arrangement with bigger
// pieces.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LobbyGame } from "../../party/lobby";
import SunflowerPainterly from "./styles/SunflowerPainterly";
import CherryTreePainterly from "./styles/CherryTreePainterly";
import LotusPondPainterly from "./styles/LotusPondPainterly";

interface GardenPickerProps {
  // Who can tap? When false, every button renders disabled.
  isHost: boolean;
  // Phone-friendly portrait scene vs. wider landscape scene.
  compact: boolean;
  // Tap handler — the game key matches `LobbyGame`.
  onPick: (game: LobbyGame) => void;
}

// Per-game styling. Colors and stem heights are tuned for the
// painterly treatment + spatial layout.
const META: Record<
  LobbyGame,
  {
    label: string;
    tagline: string;
    emoji: string;
    petalColor: string;
    petalEdge: string;
    swayKeyframes: string;
  }
> = {
  word: {
    label: "WordHive",
    tagline: "Spell with the bees",
    emoji: "🐝",
    petalColor: "#f5b400",
    petalEdge: "#3a2410",
    swayKeyframes: "lily-sway-a",
  },
  math: {
    label: "MathHive",
    tagline: "Solve the number",
    emoji: "🧮",
    petalColor: "#f7a8c4",
    petalEdge: "#7a2e4a",
    swayKeyframes: "lily-sway-b",
  },
  draw: {
    label: "Pollinart",
    tagline: "Draw, guess, repeat",
    emoji: "🎨",
    petalColor: "#f7a8c4",
    petalEdge: "#7a2e4a",
    swayKeyframes: "lily-sway-c",
  },
};

export default function GardenPicker({
  isHost,
  compact,
  onPick,
}: GardenPickerProps) {
  // Measure the wrapper to drive picker scale. Each flower
  // component sizes off its own `scale` prop; we pick scales that
  // make the scene fit nicely without overlapping tap targets.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Linear scale derived from container width. Tuned so the
  // sunflower head fits between the cherry tree and pond on a
  // 360px phone.
  const baseUnit = compact ? width / 360 : width / 1100;
  const sunflowerScale = compact ? baseUnit * 0.95 : baseUnit * 1.2;
  const cherryScale = compact ? baseUnit * 0.9 : baseUnit * 1.4;
  const lotusScale = compact ? baseUnit * 0.85 : baseUnit * 1.1;

  // Heights for the wrapper. Phone uses a fixed-ish tall layout;
  // TV gives the scene more room horizontally.
  const wrapperHeight = compact
    ? Math.min(560, Math.max(420, width * 1.4))
    : Math.min(560, Math.max(380, width * 0.42));

  // Center content (emoji) per game — same factory across all
  // three so we don't recreate per render.
  function makeEmoji(emoji: string, size: number): ReactNode {
    return (
      <text
        x={0}
        y={0}
        fontSize={size}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ userSelect: "none" }}
      >
        {emoji}
      </text>
    );
  }

  // Convenience: per-game flower with built-in bloom + sway.
  function renderCherry(scale: number) {
    return (
      <CherryTreePainterly
        petalColor={META.math.petalColor}
        petalEdge={META.math.petalEdge}
        stemLength={compact ? 220 : 260}
        scale={scale}
        swayKeyframes={META.math.swayKeyframes}
        bloomIn
        centerContent={makeEmoji(META.math.emoji, 22 * scale)}
      />
    );
  }
  function renderSunflower(scale: number) {
    return (
      <SunflowerPainterly
        petalColor={META.word.petalColor}
        petalEdge={META.word.petalEdge}
        stemLength={compact ? 170 : 220}
        scale={scale}
        swayKeyframes={META.word.swayKeyframes}
        bloomIn
        centerContent={makeEmoji(META.word.emoji, 22 * scale)}
      />
    );
  }
  function renderLotusPond(scale: number) {
    return (
      <LotusPondPainterly
        petalColor={META.draw.petalColor}
        petalEdge={META.draw.petalEdge}
        stemLength={compact ? 110 : 150}
        scale={scale}
        swayKeyframes={META.draw.swayKeyframes}
        bloomIn
        centerContent={makeEmoji(META.draw.emoji, 22 * scale)}
      />
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: wrapperHeight,
        // Generous max width on the desktop / TV path; phone fills.
        maxWidth: compact ? 480 : 1200,
        margin: "0 auto",
      }}
    >
      {/* Cherry blossom tree — upper-left anchor. */}
      <PickerSlot
        anchor={compact
          ? { left: "0%", bottom: "38%", align: "left-bottom" }
          : { left: "1%", bottom: "10%", align: "left-bottom" }}
        meta={META.math}
        isHost={isHost}
        onPick={() => onPick("math")}
      >
        {renderCherry(cherryScale)}
      </PickerSlot>

      {/* Sunflower — middle-right standing flower. */}
      <PickerSlot
        anchor={compact
          ? { right: "0%", bottom: "22%", align: "right-bottom" }
          : { left: "40%", bottom: "12%", align: "center-bottom" }}
        meta={META.word}
        isHost={isHost}
        onPick={() => onPick("word")}
      >
        {renderSunflower(sunflowerScale)}
      </PickerSlot>

      {/* Lotus pond — bottom strip, spans the width. */}
      <PickerSlot
        anchor={compact
          ? { left: "50%", bottom: "0%", align: "center-bottom" }
          : { right: "2%", bottom: "8%", align: "right-bottom" }}
        meta={META.draw}
        isHost={isHost}
        onPick={() => onPick("draw")}
      >
        {renderLotusPond(lotusScale)}
      </PickerSlot>
    </div>
  );
}

type AnchorAlign =
  | "left-bottom"
  | "right-bottom"
  | "center-bottom";

interface Anchor {
  left?: string;
  right?: string;
  bottom?: string;
  align: AnchorAlign;
}

function PickerSlot({
  anchor,
  meta,
  isHost,
  onPick,
  children,
}: {
  anchor: Anchor;
  meta: { label: string; tagline: string };
  isHost: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  // Translate the anchor into an absolute-position style.
  const style: React.CSSProperties = {
    position: "absolute",
    left: anchor.left,
    right: anchor.right,
    bottom: anchor.bottom,
    display: "flex",
    flexDirection: "column",
    alignItems:
      anchor.align === "left-bottom"
        ? "flex-start"
        : anchor.align === "right-bottom"
          ? "flex-end"
          : "center",
    pointerEvents: "auto",
    transform:
      anchor.align === "center-bottom" ? "translateX(-50%)" : undefined,
  };
  return (
    <div style={style}>
      <button
        onClick={isHost ? onPick : undefined}
        disabled={!isHost}
        aria-label={`Pick ${meta.label}`}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: isHost ? "pointer" : "default",
          opacity: isHost ? 1 : 0.6,
          filter: isHost ? undefined : "saturate(0.6)",
          transition: "opacity 0.2s",
        }}
      >
        {children}
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--fg)",
            marginTop: 4,
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          }}
        >
          {meta.label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            textAlign: "center",
            padding: "0 6px",
            lineHeight: 1.3,
            maxWidth: 140,
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          }}
        >
          {meta.tagline}
        </div>
      </button>
    </div>
  );
}
