// Pollinart drawing canvas. Phone-friendly pointer-events surface that
// captures marks in normalized 0..1000 coordinates so the receiver can
// replay at any display size. Tools: pen, eraser, fill bucket, 3 stroke
// widths, 8-color palette, undo (10 marks), clear-all.
//
// Renders into a <canvas>. The mark list is the source of truth and is
// re-rendered on every mark addition — keeps the canvas in sync with
// the undo stack and lets us hand the list off to the server as-is.
//
// Canvas background is always white: drawings travel between phones
// with different themes, so a consistent white surface keeps the colors
// readable everywhere.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawStroke, Drawing, StrokeMark } from "../shared/pollinart-types";

// Canvas backing is always white — drawings cross theme boundaries, so
// a stable surface makes colors render the same regardless of where
// the drawing was authored or where it's replayed.
export const CANVAS_BG = "#ffffff";

const PALETTE: Array<{ label: string; color: string }> = [
  { label: "black", color: "#111111" },
  { label: "red", color: "#e23a3a" },
  { label: "orange", color: "#f08020" },
  { label: "yellow", color: "#f5c84a" },
  { label: "green", color: "#3aa845" },
  { label: "blue", color: "#3a6dd0" },
  { label: "purple", color: "#9038c8" },
  { label: "brown", color: "#7a4a22" },
];

const WIDTHS: Array<{ label: string; w: number }> = [
  { label: "thin", w: 4 },
  { label: "medium", w: 10 },
  { label: "fat", w: 22 },
];

// How early (ms) before the server's deadline we fire an auto-submit
// — covers the WebSocket round-trip so our submission lands before
// the server's own timeout falls back to an empty auto-fill.
const AUTOSUBMIT_LEAD_MS = 600;

type Tool = "pen" | "eraser" | "fill";

interface DrawingCanvasProps {
  // Called whenever the user wants to submit the current drawing.
  onSubmit: (drawing: Drawing) => void;
  // True while the parent is waiting for the server to ack the submit.
  submitting?: boolean;
  // Optional cap on canvas pixel size (defaults to ~96% of the window).
  maxPx?: number;
  // The word the player is drawing — shown above the canvas.
  promptWord?: string;
  // Bottom hint, e.g. "45s left".
  bottomHint?: string;
  // Epoch ms at which the server's draw-phase timer will expire. We
  // auto-submit the current drawing slightly before that point so the
  // server uses what the player has instead of an empty auto-fill.
  autoSubmitAt?: number | null;
}

export default function DrawingCanvas({
  onSubmit,
  submitting,
  maxPx,
  promptWord,
  bottomHint,
  autoSubmitAt,
}: DrawingCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The active stroke being built up (mid-drag); committed to strokes
  // on pointerup. Only pen/eraser produce active strokes — fills are
  // instantaneous and don't have a drag phase.
  const activeRef = useRef<StrokeMark | null>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  // Mirror for the auto-submit closure so it always reads the latest.
  const strokesRef = useRef<DrawStroke[]>([]);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  const [color, setColor] = useState(PALETTE[0].color);
  const [width, setWidth] = useState(WIDTHS[1].w);
  const [tool, setTool] = useState<Tool>("pen");
  const [pxSize, setPxSize] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  // Once an auto- or manual-submit has fired, latch this so a
  // subsequent re-render or late timer firing can't double-submit.
  const submittedRef = useRef(false);

  // Size the canvas to roughly fill the available width.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const cap = maxPx ?? Math.min(window.innerWidth, window.innerHeight) - 40;
      const side = Math.min(Math.floor(rect.width), cap);
      setPxSize(side);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
    };
  }, [maxPx]);

  // Re-render the canvas whenever strokes change. We repaint everything
  // from scratch so undo/redo/fill all stay consistent.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pxSize <= 0) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = pxSize * dpr;
    canvas.height = pxSize * dpr;
    canvas.style.width = `${pxSize}px`;
    canvas.style.height = `${pxSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, pxSize, pxSize);
    const scale = pxSize / 1000;
    for (const mark of strokes) drawMarkOnCtx(ctx, mark, scale, CANVAS_BG, pxSize, dpr);
    if (activeRef.current)
      drawMarkOnCtx(ctx, activeRef.current, scale, CANVAS_BG, pxSize, dpr);
  }, [strokes, pxSize]);

  // Auto-submit just before the server's phase timer expires so the
  // player's in-progress canvas reaches the server instead of an
  // empty auto-fill.
  useEffect(() => {
    if (autoSubmitAt == null) return;
    if (submittedRef.current) return;
    const fireAt = autoSubmitAt - AUTOSUBMIT_LEAD_MS;
    const delay = Math.max(0, fireAt - Date.now());
    const id = setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      // Make sure any active stroke (mid-drag at the buzzer) gets
      // committed into the payload before we send.
      const final =
        activeRef.current && activeRef.current.points.length > 0
          ? [...strokesRef.current, activeRef.current]
          : strokesRef.current;
      onSubmit({ strokes: final });
    }, delay);
    return () => clearTimeout(id);
  }, [autoSubmitAt, onSubmit]);

  const eventToPoint = useCallback(
    (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 1000;
      const y = ((e.clientY - rect.top) / rect.height) * 1000;
      return {
        x: Math.max(0, Math.min(1000, x)),
        y: Math.max(0, Math.min(1000, y)),
      };
    },
    [],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (submitting || submittedRef.current) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pt = eventToPoint(e);
    if (tool === "fill") {
      // Instantaneous — drop a FillMark and re-render. No drag phase.
      setStrokes((s) => [...s, { kind: "fill", color, x: pt.x, y: pt.y }]);
      return;
    }
    activeRef.current = {
      kind: "stroke",
      color: tool === "eraser" ? CANVAS_BG : color,
      width,
      erase: tool === "eraser",
      points: [pt],
    };
    // Force a redraw so the first dot renders even on a tap with no drag.
    setStrokes((s) => [...s]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    e.preventDefault();
    const pt = eventToPoint(e);
    const last = activeRef.current.points[activeRef.current.points.length - 1];
    if (last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < 1.5 * 1.5) return;
    }
    activeRef.current.points.push(pt);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = pxSize / 1000;
    if (activeRef.current.points.length >= 2) {
      const a = activeRef.current.points[activeRef.current.points.length - 2];
      const b = activeRef.current.points[activeRef.current.points.length - 1];
      const stroke = activeRef.current;
      ctx.strokeStyle = stroke.erase ? CANVAS_BG : stroke.color;
      ctx.fillStyle = stroke.erase ? CANVAS_BG : stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = stroke.width * scale;
      ctx.beginPath();
      ctx.moveTo(a.x * scale, a.y * scale);
      ctx.lineTo(b.x * scale, b.y * scale);
      ctx.stroke();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    e.preventDefault();
    const finished = activeRef.current;
    activeRef.current = null;
    setStrokes((s) => [...s, finished]);
  };

  const undo = () => {
    setStrokes((s) => s.slice(0, -1));
  };

  const clearAll = () => {
    setStrokes([]);
    setConfirmClear(false);
  };

  const submit = () => {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    onSubmit({ strokes: strokesRef.current });
  };

  const canUndo = strokes.length > 0;

  return (
    <div
      ref={wrapperRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        width: "100%",
      }}
    >
      {promptWord && (
        <div
          style={{
            fontSize: 16,
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Draw:{" "}
          <strong style={{ color: "var(--fg)", fontSize: 22 }}>{promptWord}</strong>
        </div>
      )}
      <div
        style={{
          width: pxSize,
          height: pxSize,
          background: CANVAS_BG,
          borderRadius: 12,
          boxShadow: "inset 0 0 0 1px var(--border)",
          touchAction: "none",
          userSelect: "none",
          position: "relative",
        }}
      >
        {pxSize > 0 && (
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              display: "block",
              cursor:
                tool === "eraser" ? "cell" : tool === "fill" ? "copy" : "crosshair",
            }}
          />
        )}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          padding: "0 8px",
        }}
      >
        {/* Color swatches */}
        <div style={{ display: "flex", gap: 4 }}>
          {PALETTE.map((p) => (
            <button
              key={p.color}
              onClick={() => {
                setColor(p.color);
                // Tapping a color while in eraser mode jumps back to pen.
                if (tool === "eraser") setTool("pen");
              }}
              aria-label={`Color ${p.label}`}
              style={{
                width: 28,
                height: 28,
                padding: 0,
                borderRadius: 14,
                background: p.color,
                border:
                  tool !== "eraser" && color === p.color
                    ? "3px solid var(--fg)"
                    : "1px solid var(--border)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        {/* Tool toggles: pen / eraser / fill */}
        <ToolButton
          active={tool === "pen"}
          onClick={() => setTool("pen")}
          ariaLabel="Pen"
          glyph="✏️"
        />
        <ToolButton
          active={tool === "eraser"}
          onClick={() => setTool("eraser")}
          ariaLabel="Eraser"
          glyph="🧹"
        />
        <ToolButton
          active={tool === "fill"}
          onClick={() => setTool("fill")}
          ariaLabel="Fill bucket"
          glyph="🪣"
        />
        {/* Stroke widths — only meaningful for pen/eraser. */}
        <div style={{ display: "flex", gap: 4, opacity: tool === "fill" ? 0.4 : 1 }}>
          {WIDTHS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWidth(w.w)}
              disabled={tool === "fill"}
              aria-label={`Width ${w.label}`}
              style={{
                width: 36,
                height: 28,
                display: "grid",
                placeItems: "center",
                background:
                  width === w.w ? "var(--accent)" : "var(--bg-elev)",
                color: width === w.w ? "var(--accent-fg)" : "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 0,
                cursor: tool === "fill" ? "not-allowed" : "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: Math.min(w.w * 0.9, 20),
                  height: Math.min(w.w * 0.9, 20),
                  borderRadius: "50%",
                  background: width === w.w ? "var(--accent-fg)" : "var(--fg)",
                }}
              />
            </button>
          ))}
        </div>
        <button
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
          style={{
            background: "var(--bg-elev)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 16,
          }}
        >
          ↶ Undo
        </button>
        <button
          onClick={() => setConfirmClear(true)}
          aria-label="Clear canvas"
          style={{
            background: "var(--bg-elev)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 16,
          }}
        >
          ✕ Clear
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          width: "100%",
          padding: "0 8px",
          alignItems: "center",
        }}
      >
        {bottomHint && (
          <div style={{ color: "var(--muted)", fontSize: 14, flex: 1 }}>
            {bottomHint}
          </div>
        )}
        <button
          onClick={submit}
          disabled={submitting}
          style={{
            flex: 1,
            fontSize: 18,
            padding: "12px 20px",
          }}
        >
          {submitting ? "Submitting…" : "Done drawing"}
        </button>
      </div>

      {confirmClear && (
        <div
          role="dialog"
          aria-modal
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
          onClick={() => setConfirmClear(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
              maxWidth: 320,
              textAlign: "center",
            }}
          >
            <p style={{ marginTop: 0 }}>Wipe the canvas?</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={() => setConfirmClear(false)}
                style={{
                  background: "var(--bg)",
                  color: "var(--fg)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button onClick={clearAll}>Yes, clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  ariaLabel,
  glyph,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  glyph: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      style={{
        background: active ? "var(--accent)" : "var(--bg-elev)",
        color: active ? "var(--accent-fg)" : "var(--fg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 18,
      }}
    >
      {glyph}
    </button>
  );
}

// Render a single mark (stroke or fill) onto a canvas context. `scale`
// converts normalized 0..1000 units into display pixels. `pxSize` and
// `dpr` are needed for the flood-fill path which operates on the
// real pixel buffer.
export function drawMarkOnCtx(
  ctx: CanvasRenderingContext2D,
  mark: DrawStroke,
  scale: number,
  bgFill: string,
  pxSize: number,
  dpr: number,
) {
  if (mark.kind === "fill") {
    floodFill(ctx, mark.x * scale * dpr, mark.y * scale * dpr, mark.color, pxSize * dpr);
    return;
  }
  // Stroke
  const color = mark.erase ? bgFill : mark.color;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = mark.width * scale;
  const pts = mark.points;
  if (pts.length === 0) return;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x * scale, pts[0].y * scale, (mark.width * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
  }
  ctx.stroke();
}

// Stack-based 4-connected flood fill. Reads the canvas pixel buffer,
// fills connected pixels matching the seed color (within a tolerance
// to bridge anti-aliased stroke edges), writes the result back.
//
// `sxPx` / `syPx` are in BACKING-STORE pixels (so already multiplied
// by devicePixelRatio).
export function floodFill(
  ctx: CanvasRenderingContext2D,
  sxPx: number,
  syPx: number,
  fillColor: string,
  sidePx: number,
) {
  const w = Math.floor(sidePx);
  const h = Math.floor(sidePx);
  const sx = Math.floor(sxPx);
  const sy = Math.floor(syPx);
  if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
  const t = parseHexColor(fillColor);
  if (!t) return;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const start = (sy * w + sx) * 4;
  const sr = data[start];
  const sg = data[start + 1];
  const sb = data[start + 2];
  const sa = data[start + 3];
  if (sr === t.r && sg === t.g && sb === t.b && sa === 255) return;
  // Bridge anti-aliased edges — small RGB tolerance lets the fill
  // reach the visual boundary of a stroke instead of stopping a few
  // pixels short on its blurry rim.
  const TOL = 28;
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const py = stack.pop()!;
    const px = stack.pop()!;
    if (px < 0 || px >= w || py < 0 || py >= h) continue;
    const i = (py * w + px) * 4;
    if (data[i] === t.r && data[i + 1] === t.g && data[i + 2] === t.b && data[i + 3] === 255) continue;
    if (
      Math.abs(data[i] - sr) > TOL ||
      Math.abs(data[i + 1] - sg) > TOL ||
      Math.abs(data[i + 2] - sb) > TOL ||
      Math.abs(data[i + 3] - sa) > TOL
    )
      continue;
    data[i] = t.r;
    data[i + 1] = t.g;
    data[i + 2] = t.b;
    data[i + 3] = 255;
    stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
  }
  ctx.putImageData(img, 0, 0);
}

function parseHexColor(hex: string): { r: number; g: number; b: number; a: number } | null {
  if (typeof hex !== "string") return null;
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

export { PALETTE as POLLINART_PALETTE };
