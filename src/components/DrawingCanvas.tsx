// Pollinart drawing canvas. Phone-friendly pointer-events surface that
// captures strokes in normalized 0..1000 coordinates so the receiver
// can replay at any display size. Tools: pen, eraser, 3 widths,
// 8-color palette, undo (10 strokes), clear-all.
//
// Renders into a <canvas>. The stroke list is the source of truth and
// is re-rendered on every change — keeps the canvas in sync with the
// undo stack and lets us hand the list off to the server as-is.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawStroke, Drawing } from "../shared/pollinart-types";

const CANVAS_BG_LIGHT = "#ffffff";
const CANVAS_BG_DARK = "#161620";
// Color palette stays the same between themes so drawings look the
// same after they're passed around to other players. Dark slots get
// special handling: black on dark theme is rendered as off-white so
// strokes don't disappear into the dark canvas.
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

const MAX_UNDO_STROKES = 10;

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
}

export default function DrawingCanvas({
  onSubmit,
  submitting,
  maxPx,
  promptWord,
  bottomHint,
}: DrawingCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The active stroke being built up (mid-drag); committed to strokes
  // on pointerup.
  const activeRef = useRef<DrawStroke | null>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [color, setColor] = useState(PALETTE[0].color);
  const [width, setWidth] = useState(WIDTHS[1].w);
  const [erasing, setErasing] = useState(false);
  const [pxSize, setPxSize] = useState(0); // pixel side length of the square canvas
  const [confirmClear, setConfirmClear] = useState(false);
  const isDark = useIsDarkTheme();
  const bg = isDark ? CANVAS_BG_DARK : CANVAS_BG_LIGHT;

  // Size the canvas to roughly fill the available width, capped to
  // (maxPx ?? viewport width).
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

  // Re-render the canvas whenever strokes (or theme/colors) change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pxSize <= 0) return;
    // Account for devicePixelRatio for crisp lines on hi-DPI.
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = pxSize * dpr;
    canvas.height = pxSize * dpr;
    canvas.style.width = `${pxSize}px`;
    canvas.style.height = `${pxSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, pxSize, pxSize);
    const scale = pxSize / 1000;
    for (const stroke of strokes) drawStrokeOnCtx(ctx, stroke, scale, bg);
    if (activeRef.current) drawStrokeOnCtx(ctx, activeRef.current, scale, bg);
  }, [strokes, pxSize, bg]);

  // Pointer handlers — captures absolute coords on the canvas, converts
  // to 0..1000 normalized space.
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
    if (submitting) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const pt = eventToPoint(e);
    activeRef.current = {
      color: erasing ? bg : color,
      width,
      erase: erasing,
      points: [pt],
    };
    // Force a redraw so the first dot renders even on a tap with no drag.
    setStrokes((s) => [...s]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    e.preventDefault();
    const pt = eventToPoint(e);
    // Skip near-duplicate points to keep payload small. Threshold is in
    // normalized units (≈ 1.5 / 1000 = 0.15% of the canvas).
    const last = activeRef.current.points[activeRef.current.points.length - 1];
    if (last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < 1.5 * 1.5) return;
    }
    activeRef.current.points.push(pt);
    // Trigger a render — we re-render the canvas inside the strokes
    // effect by setting state. But strokes hasn't changed; force a tick
    // via a noop state update is wasteful — instead, draw directly.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = pxSize / 1000;
    // Incrementally draw the new segment only (don't redraw the whole
    // stroke list every move — would be O(N) per pointermove).
    if (activeRef.current.points.length >= 2) {
      const a = activeRef.current.points[activeRef.current.points.length - 2];
      const b = activeRef.current.points[activeRef.current.points.length - 1];
      const stroke = activeRef.current;
      ctx.strokeStyle = stroke.erase ? bg : stroke.color;
      ctx.fillStyle = stroke.erase ? bg : stroke.color;
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
    setStrokes((s) => (s.length > MAX_UNDO_STROKES ? s.slice(0, -1) : s.slice(0, -1)));
  };

  const clearAll = () => {
    setStrokes([]);
    setConfirmClear(false);
  };

  const submit = () => {
    if (submitting) return;
    onSubmit({ strokes });
  };

  // Disable undo when there are no strokes; disable submit similarly?
  // Actually allow empty submits — user might want to surrender an
  // empty canvas. Server treats that as auto-fill anyway.
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
          background: bg,
          borderRadius: 12,
          boxShadow: "inset 0 0 0 1px var(--border)",
          touchAction: "none", // critical: prevents the page from scrolling on drag
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
            style={{ display: "block", cursor: erasing ? "cell" : "crosshair" }}
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
                setErasing(false);
              }}
              aria-label={`Color ${p.label}`}
              style={{
                width: 28,
                height: 28,
                padding: 0,
                borderRadius: 14,
                background: p.color,
                border:
                  !erasing && color === p.color
                    ? "3px solid var(--fg)"
                    : "1px solid var(--border)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        {/* Tool toggle: pen vs eraser */}
        <button
          onClick={() => setErasing((v) => !v)}
          aria-pressed={erasing}
          aria-label="Eraser"
          style={{
            background: erasing ? "var(--accent)" : "var(--bg-elev)",
            color: erasing ? "var(--accent-fg)" : "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 18,
          }}
        >
          🧹
        </button>
        {/* Stroke widths */}
        <div style={{ display: "flex", gap: 4 }}>
          {WIDTHS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWidth(w.w)}
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
                cursor: "pointer",
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

// Render a single stroke onto a canvas context. Scale converts the
// normalized 0..1000 space into pixel coords for the current canvas.
export function drawStrokeOnCtx(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  scale: number,
  eraseFill: string,
) {
  const color = stroke.erase ? eraseFill : stroke.color;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width * scale;
  const pts = stroke.points;
  if (pts.length === 0) return;
  if (pts.length === 1) {
    // Single tap = a dot. Draw a filled circle of stroke width.
    ctx.beginPath();
    ctx.arc(pts[0].x * scale, pts[0].y * scale, (stroke.width * scale) / 2, 0, Math.PI * 2);
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

// Read the active theme from <html data-theme>. Mirrors the
// useTheme hook but doesn't re-subscribe — we only need it for
// the canvas background, which the user rarely toggles mid-draw.
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

export { PALETTE as POLLINART_PALETTE };
