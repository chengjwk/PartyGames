// Renders a Pollinart Drawing payload onto a canvas at the chosen
// display size. Used by:
//   - the guess phase (player sees the drawing they have to guess)
//   - the reveal phase (everyone watches each chain step appear)
//   - the round-results recap
//
// Pure renderer: takes a Drawing (mark list in 0..1000 normalized
// coords) and paints it into a fixed-size square canvas. Canvas
// background is always white — drawings travel between theme
// boundaries and need to render the same on both ends.

import { useEffect, useRef, useState } from "react";
import type { Drawing } from "../shared/pollinart-types";
import { drawMarkOnCtx, floodFill, CANVAS_BG } from "./DrawingCanvas";

interface DrawingReplayProps {
  drawing: Drawing;
  size: number;
  rounded?: boolean;
  // If true, animate strokes appearing one-by-one (used in reveal).
  // Otherwise paint statically.
  animate?: boolean;
  // ms between stroke segments while animating. Default 4ms — fast.
  pacingMs?: number;
  className?: string;
}

export default function DrawingReplay({
  drawing,
  size,
  rounded = true,
  animate,
  pacingMs = 4,
  className,
}: DrawingReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-trigger animation when the drawing reference changes (e.g. when
  // the reveal advances to the next step).
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
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, size, size);
    const scale = size / 1000;
    if (!animate) {
      for (const mark of drawing.strokes)
        drawMarkOnCtx(ctx, mark, scale, CANVAS_BG, size, dpr);
      return;
    }
    // Animated playback: paint marks one-by-one. Strokes are drawn
    // segment-by-segment for a "watch them draw it" effect; fills pop
    // in at their position in the order.
    let cancelled = false;
    let s = 0;
    let p = 0;
    function step() {
      if (cancelled) return;
      if (s >= drawing.strokes.length) return;
      const mark = drawing.strokes[s];
      if (mark.kind === "fill") {
        floodFill(ctx!, mark.x * scale * dpr, mark.y * scale * dpr, mark.color, size * dpr);
        s++;
        p = 0;
        // Small extra pause after a fill so the eye catches the change.
        setTimeout(step, Math.max(pacingMs * 4, 30));
        return;
      }
      // Stroke
      if (p === 0) {
        if (mark.points.length > 0) {
          const pt = mark.points[0];
          ctx!.fillStyle = mark.erase ? CANVAS_BG : mark.color;
          ctx!.beginPath();
          ctx!.arc(
            pt.x * scale,
            pt.y * scale,
            (mark.width * scale) / 2,
            0,
            Math.PI * 2,
          );
          ctx!.fill();
        }
        p = 1;
      } else if (p < mark.points.length) {
        const a = mark.points[p - 1];
        const b = mark.points[p];
        ctx!.strokeStyle = mark.erase ? CANVAS_BG : mark.color;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.lineWidth = mark.width * scale;
        ctx!.beginPath();
        ctx!.moveTo(a.x * scale, a.y * scale);
        ctx!.lineTo(b.x * scale, b.y * scale);
        ctx!.stroke();
        p++;
      } else {
        s++;
        p = 0;
      }
      setTimeout(step, pacingMs);
    }
    step();
    return () => {
      cancelled = true;
    };
  }, [drawing, size, animate, pacingMs, animKey]);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: CANVAS_BG,
        borderRadius: rounded ? 12 : 0,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px var(--border)",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
