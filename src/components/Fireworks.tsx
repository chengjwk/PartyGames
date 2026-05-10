// Continuously spawns radial particle bursts at random points in the upper
// portion of the viewport. Pure CSS animation — no canvas, no rAF loop.
//
// Mount this on the final-results screen for celebration; pointer-events
// are disabled so it doesn't interfere with the underlying UI.

import { useEffect, useState } from "react";

interface Burst {
  id: number;
  x: number; // viewport %
  y: number; // viewport %
  color: string;
}

const COLORS = [
  "#ff5e7e",
  "#ffd166",
  "#06d6a0",
  "#4cc9f0",
  "#ef476f",
  "#f7c873",
  "#c084fc",
];

const BURST_INTERVAL_MS = 380;
const BURST_LIFETIME_MS = 1500;

export default function Fireworks() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    let next = 0;
    const interval = setInterval(() => {
      const id = next++;
      setBursts((prev) => [
        ...prev,
        {
          id,
          x: 8 + Math.random() * 84,
          y: 5 + Math.random() * 50,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        },
      ]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, BURST_LIFETIME_MS);
    }, BURST_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes fw-particle {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
        }
      `}</style>
      {bursts.map((b) => (
        <BurstView key={b.id} x={b.x} y={b.y} color={b.color} />
      ))}
    </div>
  );
}

function BurstView({ x, y, color }: { x: number; y: number; color: string }) {
  // 14 particles fanning out at random angles; small jitter so each burst
  // doesn't look identical.
  const particles = Array.from({ length: 14 }, (_, i) => {
    const angle = ((Math.PI * 2) / 14) * i + (Math.random() - 0.5) * 0.4;
    const radius = 70 + Math.random() * 50;
    return {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
    };
  });
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: 0,
        height: 0,
      }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          style={
            {
              position: "absolute",
              width: 9,
              height: 9,
              left: -4.5,
              top: -4.5,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 10px ${color}`,
              animation: `fw-particle ${BURST_LIFETIME_MS}ms ease-out forwards`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
