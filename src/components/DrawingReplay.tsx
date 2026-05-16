// Renders a Pollinart Drawing payload onto a canvas at the chosen
// display size. Used by:
//   - the guess phase (player sees the drawing they have to guess)
//   - the reveal phase (everyone watches each chain step appear)
//   - the round-results recap
//
// Pure renderer: takes a Drawing (stroke list in 0..1000 normalized
// coords) and paints it into a fixed-size square canvas. No edits.

import { useEffect, useRef, useState } from "react";
import type { Drawing } from "../shared/pollinart-types";
import { drawStrokeOnCtx } from "./DrawingCanvas";

interface DrawingReplayProps {
  drawing: Drawing;
  // Pixel side length. Square aspect.
  size: number;
  // Optional border radius for the canvas backing.
  rounded?: boolean;
  // Optional override of the canvas background color. Defaults to
  // white (light theme) / dark (dark theme).
  background?: string;
  // If true, animate the strokes appearing one-by-one (used in
  // reveal). Otherwise paint statically.
  animate?: boolean;
  // ms between stroke segments while animating. Default 4ms — fast.
  pacingMs?: number;
  // Optional className for outer wrapper.
  className?: string;
}

export default function DrawingReplay({
  drawing,
  size,
  rounded = true,
  background,
  animate,
  pacingMs = 4,
  className,
}: DrawingReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDark = useIsDarkTheme();
  const bg = background ?? (isDark ? "#161620" : "#ffffff");

  // Track the animation cursor so the parent can re-trigger it (e.g.
  // when revealing a new step) by changing the `drawing` prop reference.
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (animate) setAnimKey((k) => k + 1);
  }, [drawing, animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size <= 0) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    const scale = size / 1000;
    if (!animate) {
      for (const stroke of drawing.strokes) drawStrokeOnCtx(ctx, stroke, scale, bg);
      return;
    }
    // Animated: paint strokes one-by-one, point-by-point.
    let cancelled = false;
    let s = 0;
    let p = 0;
    function step() {
      if (cancelled) return;
      if (s >= drawing.strokes.length) return;
      const stroke = drawing.strokes[s];
      if (p === 0) {
        // first point: lay down a dot
        if (stroke.points.length > 0) {
          const pt = stroke.points[0];
          if (ctx) {
            ctx.fillStyle = stroke.erase ? bg : stroke.color;
            ctx.beginPath();
            ctx.arc(
              pt.x * scale,
              pt.y * scale,
              (stroke.width * scale) / 2,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        p = 1;
      } else if (p < stroke.points.length) {
        const a = stroke.points[p - 1];
        const b = stroke.points[p];
        if (ctx) {
          ctx.strokeStyle = stroke.erase ? bg : stroke.color;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = stroke.width * scale;
          ctx.beginPath();
          ctx.moveTo(a.x * scale, a.y * scale);
          ctx.lineTo(b.x * scale, b.y * scale);
          ctx.stroke();
        }
        p++;
      } else {
        s++;
        p = 0;
      }
      // Step multiple points per RAF tick so long drawings still finish
      // in a reasonable time. Tunable via pacingMs.
      setTimeout(step, pacingMs);
    }
    step();
    return () => {
      cancelled = true;
    };
  }, [drawing, size, bg, animate, pacingMs, animKey]);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: rounded ? 12 : 0,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

function useIsDarkTheme(): boolean {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return (document.documentElement.dataset.theme ?? "dark") !== "light";
  });
  useEffect(() => {
    const onChange = () => {
      setDark((document.documentElement.dataset.theme ?? "dark") !== "light");
    };
    window.addEventListener("partygames:theme-change", onChange);
    return () => window.removeEventListener("partygames:theme-change", onChange);
  }, []);
  return dark;
}
