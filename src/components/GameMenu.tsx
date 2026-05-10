import { useState } from "react";
import type { ClientMessage, PublicGameState } from "../shared/types";

interface GameMenuProps {
  state: PublicGameState;
  send: (msg: ClientMessage) => void;
}

// Floating top-left menu — pause/resume during a round, plus a "stop game"
// option (with confirm) that returns the room to the lobby. Available on
// every screen while a game is in progress.
export default function GameMenu({ state, send }: GameMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  // Hide entirely in the lobby — nothing to pause or stop.
  if (state.phase === "LOBBY") return null;

  const canPause = state.phase === "ROUND_PLAYING";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Game menu"
        title="Game menu"
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "var(--bg-elev)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 18,
          opacity: 0.7,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DotsIcon />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 15, 20, 0.6)",
            zIndex: 70,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            padding: "60px 12px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 8,
              minWidth: 200,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {canPause && (
              <button
                onClick={() => {
                  send({ type: "togglePause" });
                  setOpen(false);
                }}
                style={menuItemStyle}
              >
                {state.paused ? "▶  Resume" : "⏸  Pause"}
              </button>
            )}
            <button
              onClick={() => {
                setConfirmStop(true);
                setOpen(false);
              }}
              style={{ ...menuItemStyle, color: "#ff7e7e" }}
            >
              ⏹  Stop game
            </button>
            <button onClick={() => setOpen(false)} style={cancelStyle}>
              Close
            </button>
          </div>
        </div>
      )}

      {confirmStop && (
        <ConfirmStop
          onCancel={() => setConfirmStop(false)}
          onConfirm={() => {
            send({ type: "resetGame" });
            setConfirmStop(false);
          }}
        />
      )}
    </>
  );
}

function ConfirmStop({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 20, 0.85)",
        backdropFilter: "blur(4px)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 22,
          maxWidth: 420,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Stop the game?</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          This ends the round and returns everyone to the lobby. Scores and
          words will be cleared.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              fontSize: 16,
              padding: 14,
              background: "var(--bg-elev)",
              color: "var(--fg)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              fontSize: 16,
              padding: 14,
              background: "#c04040",
              color: "#fff",
            }}
          >
            Stop game
          </button>
        </div>
      </div>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}

const menuItemStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--fg)",
  border: "none",
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 16,
  textAlign: "left",
  cursor: "pointer",
};

const cancelStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "none",
  padding: "10px 14px",
  fontSize: 14,
  textAlign: "center",
  cursor: "pointer",
};
