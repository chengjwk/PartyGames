// Dev preview route for the StealingBee reveal animation. Not linked
// from the app — visit /preview/stealing-bee.
//
// A handful of canned drawings + buttons to spawn the bee carrying
// each one. Toggle between phone (56px) and TV (140px) thumbnail
// sizes to preview both contexts without running a real game.

import { useState } from "react";
import StealingBee from "../components/StealingBee";
import DrawingReplay from "../components/DrawingReplay";
import type { Drawing } from "../shared/pollinart-types";

// Canned drawings, in the same 0..1000 normalized coordinate space
// as the live canvas. Hand-traced to be recognizable but quick.
const SMILEY: Drawing = {
  strokes: [
    {
      kind: "stroke",
      color: "#1a1a1f",
      width: 22,
      points: circlePoints(500, 500, 320, 96),
    },
    { kind: "stroke", color: "#1a1a1f", width: 28, points: dotPoints(400, 420) },
    { kind: "stroke", color: "#1a1a1f", width: 28, points: dotPoints(600, 420) },
    {
      kind: "stroke",
      color: "#1a1a1f",
      width: 22,
      points: arcPoints(500, 560, 160, Math.PI * 0.15, Math.PI * 0.85, 32),
    },
  ],
};

const HOUSE: Drawing = {
  strokes: [
    // Walls
    {
      kind: "stroke",
      color: "#3a2a14",
      width: 18,
      points: [
        { x: 250, y: 700 },
        { x: 250, y: 450 },
        { x: 750, y: 450 },
        { x: 750, y: 700 },
        { x: 250, y: 700 },
      ],
    },
    // Roof
    {
      kind: "stroke",
      color: "#a64628",
      width: 20,
      points: [
        { x: 200, y: 450 },
        { x: 500, y: 230 },
        { x: 800, y: 450 },
      ],
    },
    // Door
    {
      kind: "stroke",
      color: "#3a2a14",
      width: 16,
      points: [
        { x: 440, y: 700 },
        { x: 440, y: 560 },
        { x: 560, y: 560 },
        { x: 560, y: 700 },
      ],
    },
    // Window
    {
      kind: "stroke",
      color: "#2a6ed8",
      width: 14,
      points: rectPoints(300, 500, 80, 80),
    },
  ],
};

const TREE: Drawing = {
  strokes: [
    // Trunk
    {
      kind: "stroke",
      color: "#5a3a1f",
      width: 30,
      points: [
        { x: 500, y: 800 },
        { x: 500, y: 540 },
      ],
    },
    // Canopy — three overlapping blobs as one stroke
    {
      kind: "stroke",
      color: "#3f8a3a",
      width: 80,
      points: circlePoints(500, 380, 180, 48),
    },
    {
      kind: "stroke",
      color: "#3f8a3a",
      width: 80,
      points: circlePoints(380, 440, 140, 36),
    },
    {
      kind: "stroke",
      color: "#3f8a3a",
      width: 80,
      points: circlePoints(620, 440, 140, 36),
    },
  ],
};

const SAMPLES: Array<{ label: string; drawing: Drawing }> = [
  { label: "Smiley", drawing: SMILEY },
  { label: "House", drawing: HOUSE },
  { label: "Tree", drawing: TREE },
];

export default function BeePreview() {
  const [bee, setBee] = useState<{ drawing: Drawing; key: string } | null>(null);
  const [thumbSize, setThumbSize] = useState<56 | 140>(56);
  // Monotonic counter so each spawn gets a fresh key even if the user
  // re-taps the same sample.
  const [serial, setSerial] = useState(0);
  const spawn = (drawing: Drawing) => {
    setSerial((s) => s + 1);
    setBee({ drawing, key: `bee-${serial + 1}` });
  };
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      <header>
        <h1 style={{ margin: 0 }}>Stealing-bee preview</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>
          Tap a drawing to see the bee fly off with it. Toggle the thumb
          size to compare phone (56px) vs TV (140px).
        </p>
      </header>

      <section
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ marginRight: 4 }}>Thumb size:</strong>
        <SizeBtn label="Phone (56)" active={thumbSize === 56} onClick={() => setThumbSize(56)} />
        <SizeBtn label="TV (140)" active={thumbSize === 140} onClick={() => setThumbSize(140)} />
      </section>

      <section
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => spawn(s.drawing)}
            style={{
              padding: 12,
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <DrawingReplay drawing={s.drawing} size={180} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{s.label}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Tap to send bee
            </span>
          </button>
        ))}
      </section>

      <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 13 }}>
        Bee crosses the viewport over ~1.6s, then auto-unmounts. Spam-tap
        is fine — each tap remounts a fresh animation via the key change.
      </p>

      {bee && (
        <StealingBee
          key={bee.key}
          drawing={bee.drawing}
          thumbSize={thumbSize}
          onDone={() => setBee(null)}
        />
      )}
    </main>
  );
}

function SizeBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        background: active ? "var(--accent)" : "var(--bg-elev)",
        color: active ? "var(--accent-fg)" : "var(--fg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─────────── Tiny geometry helpers for the canned drawings ───────────

function circlePoints(cx: number, cy: number, r: number, n: number) {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  n: number,
) {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}

function dotPoints(x: number, y: number) {
  return [
    { x, y },
    { x: x + 0.1, y },
  ];
}

function rectPoints(x: number, y: number, w: number, h: number) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
}
