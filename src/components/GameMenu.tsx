import { useState } from "react";
import type { ClientMessage, PublicGameState } from "../shared/types";

interface GameMenuProps {
  state: PublicGameState;
  send: (msg: ClientMessage) => void;
}

// Two floating buttons in the top-left: Pause/Resume (only during play) and
// Stop (always in-game). Stop opens a confirm dialog before resetting.
export default function GameMenu({ state, send }: GameMenuProps) {
  const [confirmStop, setConfirmStop] = useState(false);

  if (state.phase === "LOBBY") return null;
  const canPause = state.phase === "ROUND_PLAYING";

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10,
          display: "flex",
          gap: 8,
        }}
      >
        {canPause && (
          <button
            onClick={() => send({ type: "togglePause" })}
            aria-label={state.paused ? "Resume game" : "Pause game"}
            title={state.paused ? "Resume" : "Pause"}
            style={controlButtonStyle}
          >
            {state.paused ? <PlayIcon /> : <PauseIcon />}
            <span style={labelStyle}>{state.paused ? "Resume" : "Pause"}</span>
          </button>
        )}
        <button
          onClick={() => setConfirmStop(true)}
          aria-label="Stop game"
          title="Stop game"
          style={{
            ...controlButtonStyle,
            color: "#ff8e8e",
            borderColor: "#5a2a2a",
          }}
        >
          <StopIcon />
          <span style={labelStyle}>Stop</span>
        </button>
      </div>

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

const controlButtonStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--fg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 15,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  opacity: 0.95,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
};

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5 L19 12 L7 19 Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
