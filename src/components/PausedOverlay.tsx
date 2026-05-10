import { QRCodeSVG } from "qrcode.react";
import type { Player } from "../shared/types";

interface PausedOverlayProps {
  roomCode: string;
  disconnected: Player[];
  showQR: boolean; // big TV view shows QR; phones don't need it
  onSkip?: () => void; // present only when current viewer is host
}

export default function PausedOverlay({ roomCode, disconnected, showQR, onSkip }: PausedOverlayProps) {
  const playUrl = `${window.location.origin}/play/${roomCode}`;
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
      <div style={{ fontSize: showQR ? 28 : 20, color: "var(--fg)", maxWidth: 700 }}>
        Waiting for{" "}
        <strong>
          {disconnected.length === 0
            ? "a player"
            : disconnected.map((p) => `${p.avatar} ${p.name}`).join(", ")}
        </strong>{" "}
        to reconnect…
      </div>
      {showQR && (
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
      {onSkip && (
        <button onClick={onSkip} style={{ fontSize: 18, padding: "12px 22px" }}>
          Skip & continue without them
        </button>
      )}
    </div>
  );
}
