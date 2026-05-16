// Pollinart drawing canvas. Phone-friendly pointer-events surface that
// captures marks in normalized 0..1000 coordinates so the receiver can
// replay at any display size.
//
// Tools: pen, eraser, fill bucket, 3 widths, color wheel + 6 quick
// colors, undo, clear-all.
//
// Layout priority: drawing surface should be as large as possible.
// Toolbar wraps under the canvas; "Done drawing" CTA pinned to the
// bottom. ResizeObserver continually measures the available width so
// the canvas fills any space the toolbar leaves behind.
//
// Canvas background is always white — drawings travel between phones
// with different themes, so a consistent white surface keeps the
// colors readable everywhere.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawStroke, Drawing, StrokeMark } from "../shared/pollinart-types";

export const CANVAS_BG = "#ffffff";

// Quick-access colors for tap-fast color switching. Color wheel is
// available beside these for any custom color.
const QUICK_COLORS: Array<{ label: string; color: string }> = [
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
  onSubmit: (drawing: Drawing) => void;
  submitting?: boolean;
  // Pixel cap. If unset the canvas grows to fill the available wrapper
  // width up to viewport bounds.
  maxPx?: number;
  // The word the player is drawing — shown above the canvas.
  promptWord?: string;
  // Free-text hint shown above the toolbar (e.g. "Passing to Alice").
  passHint?: string;
  autoSubmitAt?: number | null;
}

export default function DrawingCanvas({
  onSubmit,
  submitting,
  maxPx,
  promptWord,
  passHint,
  autoSubmitAt,
}: DrawingCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Active stroke being built up (mid-drag); committed to strokes on
  // pointerup. Only pen/eraser produce active strokes — fills are
  // instantaneous and have no drag phase.
  const activeRef = useRef<StrokeMark | null>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  // Mirror for the auto-submit closure so it always reads the latest.
  const strokesRef = useRef<DrawStroke[]>([]);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  const [color, setColor] = useState(QUICK_COLORS[0].color);
  const [width, setWidth] = useState(WIDTHS[1].w);
  const [tool, setTool] = useState<Tool>("pen");
  const [pxSize, setPxSize] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

  const submittedRef = useRef(false);

  // Size the canvas to fill the wrapper width, capped at maxPx or the
  // viewport, with a small allowance for the toolbar height.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Reserve space for the toolbar + buttons below the canvas.
      // Approximate: 4 rows of 36px on a phone = ~150-200px.
      const reservedBelow = 220;
      const cap =
        maxPx ?? Math.min(window.innerWidth - 16, window.innerHeight - reservedBelow);
      const side = Math.max(160, Math.min(Math.floor(rect.width), cap));
      setPxSize(side);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("resize", measure);
    };
  }, [maxPx]);

  // Repaint whenever strokes change. Repaint-from-scratch keeps undo /
  // fill / order all consistent.
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

  // Auto-submit right before the server's deadline.
  useEffect(() => {
    if (autoSubmitAt == null) return;
    if (submittedRef.current) return;
    const fireAt = autoSubmitAt - AUTOSUBMIT_LEAD_MS;
    const delay = Math.max(0, fireAt - Date.now());
    const id = setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;
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

  const undo = () => setStrokes((s) => s.slice(0, -1));
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
        gap: 6,
        width: "100%",
      }}
    >
      {(promptWord || passHint) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {promptWord && (
            <div style={{ fontSize: 16, color: "var(--muted)", textAlign: "center" }}>
              Draw:{" "}
              <strong style={{ color: "var(--fg)", fontSize: 22 }}>
                {promptWord}
              </strong>
            </div>
          )}
          {passHint && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{passHint}</div>
          )}
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

      {/* Toolbar — two compact rows so colors/tools/widths and
          actions don't get cramped on phones. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          padding: "0 4px",
        }}
      >
        {/* Color wheel button — opens an HSL color picker. The button's
            fill shows the current pen color. Quick-access swatches follow. */}
        <button
          onClick={() => setWheelOpen(true)}
          aria-label="Open color wheel"
          title="Open color wheel"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            borderRadius: 16,
            background:
              "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
            border:
              tool !== "eraser" ? "3px solid var(--fg)" : "1px solid var(--border)",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: "50%",
              background: color,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </button>
        <div style={{ display: "flex", gap: 3 }}>
          {QUICK_COLORS.map((p) => (
            <button
              key={p.color}
              onClick={() => {
                setColor(p.color);
                if (tool === "eraser") setTool("pen");
              }}
              aria-label={`Color ${p.label}`}
              style={{
                width: 26,
                height: 26,
                padding: 0,
                borderRadius: 13,
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
        <ToolButton
          active={tool === "pen"}
          onClick={() => setTool("pen")}
          ariaLabel="Pen"
          icon={<PenIcon />}
        />
        <ToolButton
          active={tool === "eraser"}
          onClick={() => setTool("eraser")}
          ariaLabel="Eraser"
          icon={<EraserIcon />}
        />
        <ToolButton
          active={tool === "fill"}
          onClick={() => setTool("fill")}
          ariaLabel="Fill bucket"
          icon={<FillIcon />}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", gap: 3, opacity: tool === "fill" ? 0.4 : 1 }}>
          {WIDTHS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWidth(w.w)}
              disabled={tool === "fill"}
              aria-label={`Width ${w.label}`}
              style={{
                width: 32,
                height: 26,
                display: "grid",
                placeItems: "center",
                background: width === w.w ? "var(--accent)" : "var(--bg-elev)",
                color: width === w.w ? "var(--accent-fg)" : "var(--fg)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: 0,
                cursor: tool === "fill" ? "not-allowed" : "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: Math.min(w.w * 0.9, 18),
                  height: Math.min(w.w * 0.9, 18),
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
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 14,
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
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 14,
          }}
        >
          ✕ Clear
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          style={{
            marginLeft: "auto",
            fontSize: 16,
            padding: "8px 16px",
          }}
        >
          {submitting ? "Submitting…" : "Done"}
        </button>
      </div>

      {confirmClear && (
        <ConfirmModal
          message="Wipe the canvas?"
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearAll}
          confirmLabel="Yes, clear"
        />
      )}

      {wheelOpen && (
        <ColorWheelModal
          initial={color}
          onPick={(c) => {
            setColor(c);
            if (tool === "eraser") setTool("pen");
            setWheelOpen(false);
          }}
          onClose={() => setWheelOpen(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Color wheel modal
// ──────────────────────────────────────────────────────────────────

// HSL color wheel: hue around the circle, saturation outward from
// center. A separate lightness slider underneath tints/shades the
// selected hue+sat. Tap-anywhere on the wheel to set color; the
// preview swatch on the side shows the current pick.
function ColorWheelModal({
  initial,
  onPick,
  onClose,
}: {
  initial: string;
  onPick: (c: string) => void;
  onClose: () => void;
}) {
  // Decompose the incoming color into HSL so the picker opens on the
  // current value. Defaults to mid-saturation red if parsing fails.
  const init = hexToHsl(initial) ?? { h: 0, s: 80, l: 50 };
  const [h, setH] = useState(init.h);
  const [s, setS] = useState(init.s);
  const [l, setL] = useState(init.l);
  const wheelRef = useRef<HTMLDivElement | null>(null);

  const pickFromWheel = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // Angle 0 at top, increasing clockwise — matches the conic-gradient
    // we're rendering.
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const hue = ((angle % 360) + 360) % 360;
    const radius = rect.width / 2;
    const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
    const sat = Math.round((dist / radius) * 100);
    setH(Math.round(hue));
    setS(sat);
  };

  const current = hslToHex(h, s, l);

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
          maxWidth: 340,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Color wheel</div>
        <div
          ref={wheelRef}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            pickFromWheel(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") return;
            pickFromWheel(e);
          }}
          style={{
            width: 240,
            height: 240,
            borderRadius: "50%",
            // Conic-gradient + my pickFromWheel angle math must agree
            // on which color sits where. The gradient defaults to top=0
            // and goes clockwise. We pin colors at explicit gradient
            // angles (0°=red, 60°=yellow, 120°=green …) so the colors
            // align with HSL hue picked by the click handler.
            background:
              "conic-gradient(from 0deg, #ff0000 0deg, #ffff00 60deg, #00ff00 120deg, #00ffff 180deg, #0000ff 240deg, #ff00ff 300deg, #ff0000 360deg)",
            position: "relative",
            touchAction: "none",
            cursor: "crosshair",
          }}
        >
          {/* White-to-transparent radial overlay = saturation falls
              off toward the center (white = 0% sat). */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
            }}
          />
          {/* Indicator dot at the current (h, s) position. */}
          <Indicator h={h} s={s} />
        </div>

        {/* Lightness slider */}
        <div style={{ width: "100%", padding: "0 8px" }}>
          <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>
            Lightness
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={l}
            onChange={(e) => setL(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: current,
            }}
          />
        </div>

        {/* Preview + apply */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
          }}
        >
          <div
            aria-label="Preview"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: current,
              border: "1px solid var(--border)",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.1)",
            }}
          />
          <div
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: 16,
              color: "var(--fg)",
            }}
          >
            {current}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button onClick={() => onPick(current)}>Use</button>
        </div>
      </div>
    </div>
  );
}

function Indicator({ h, s }: { h: number; s: number }) {
  // Position the dot on the wheel using the same coordinate system as
  // the conic-gradient (0° at top, clockwise).
  const radius = 120; // half of wheel size
  const a = ((h - 90) * Math.PI) / 180;
  const r = (s / 100) * (radius - 6);
  const x = radius + r * Math.cos(a) - 6;
  const y = radius + r * Math.sin(a) - 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.95)",
        boxShadow: "0 0 0 1.5px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────
// Simple confirm dialog
// ──────────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
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
      onClick={onCancel}
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
        <p style={{ marginTop: 0 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              background: "var(--bg)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  ariaLabel,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon: React.ReactNode;
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
        borderRadius: 6,
        padding: "5px 9px",
        fontSize: 16,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon}
    </button>
  );
}

// Small inline SVG icons — give the toolbar a consistent silhouette
// independent of emoji rendering (the broom emoji we had before reads
// as "sweeping", not "eraser").
function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M14 4 L20 10 L9 21 L3 21 L3 15 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M13 5 L19 11" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      {/* Pink pencil-eraser block tilted, with a metal ferrule. */}
      <g transform="rotate(-30 12 12)">
        <rect
          x="3"
          y="10"
          width="13"
          height="8"
          rx="1.5"
          fill="#f48aa7"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <rect
          x="13"
          y="10"
          width="4"
          height="8"
          fill="#b8b8c2"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <line
          x1="14.2"
          y1="10"
          x2="14.2"
          y2="18"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <line
          x1="15.6"
          y1="10"
          x2="15.6"
          y2="18"
          stroke="currentColor"
          strokeWidth="0.6"
        />
      </g>
    </svg>
  );
}

function FillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      {/* Paint bucket tipped, with a drop. */}
      <path
        d="M5 9 L13 3 L20 9 L13 15 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M5 9 L13 15 L13 20 L5 14 Z" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="17" r="2.2" fill="#3a6dd0" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────
// Color math helpers
// ──────────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else[r, g, b] = [c, 0, x];
  const to2 = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ──────────────────────────────────────────────────────────────────
// Mark rendering — shared with DrawingReplay
// ──────────────────────────────────────────────────────────────────

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
  const TOL = 28;
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const py = stack.pop()!;
    const px = stack.pop()!;
    if (px < 0 || px >= w || py < 0 || py >= h) continue;
    const i = (py * w + px) * 4;
    if (data[i] === t.r && data[i + 1] === t.g && data[i + 2] === t.b && data[i + 3] === 255)
      continue;
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

export { QUICK_COLORS as POLLINART_PALETTE };
