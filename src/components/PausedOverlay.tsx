import { QRCodeSVG } from "qrcode.react";
import type { Player } from "../shared/types";

interface PausedOverlayProps {
  roomCode: string;
  disconnected: Player[];
  showQR: boolean; // big TV view shows QR; phones don't need it
  onResume: () => void; // togglePause — anyone can call
  game?: "word" | "math";
}

export default function PausedOverlay({ roomCode, disconnected, showQR, onResume, game = "word" }: PausedOverlayProps) {
  const playUrl = `${window.location.origin}/play/${game}/${roomCode}`;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 20, 0.92)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: showQR ? 72 : 36, fontWeight: 800, color: "var(--accent)", letterSpacing: 2 }}>
        PAUSED
      </div>
      {disconnected.length > 0 ? (
        <div style={{ fontSize: showQR ? 28 : 20, color: "var(--fg)", maxWidth: 700 }}>
          Waiting for{" "}
          <strong>
            {disconnected.map((p) => `${p.avatar} ${p.name}`).join(", ")}
          </strong>{" "}
          to reconnect…
        </div>
      ) : (
        <div style={{ fontSize: showQR ? 28 : 20, color: "var(--muted)", maxWidth: 700 }}>
          Tap Resume on any device to continue.
        </div>
      )}
      {showQR && disconnected.length > 0 && (
        <>
          <div
            style={{
              background: "white",
              padding: 12,
              borderRadius: 12,
              display: "inline-block",
            }}
          >
            <QRCodeSVG value={playUrl} size={220} />
          </div>
          <div style={{ fontFamily: "monospace", color: "var(--muted)" }}>{playUrl}</div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: 8 }}>{roomCode}</div>
        </>
      )}
      <button onClick={onResume} style={{ fontSize: 20, padding: "14px 28px" }}>
        ▶  Resume
      </button>
      {disconnected.length > 0 && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Resuming will continue without disconnected players.
        </div>
      )}
    </div>
  );
}
