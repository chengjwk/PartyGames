import { useState } from "react";
import type { ClientMessage, PublicGameState } from "../shared/types";

interface GameMenuProps {
  state: PublicGameState;
  send: (msg: ClientMessage) => void;
  // True if the viewer is currently the host player (or has host conn).
  // Switch-game is host-only because it affects every connected device.
  isHost?: boolean;
}

// Floating top-left buttons: Pause/Resume (during play) + Stop (any in-game
// phase) + Switch (host only — kicks everyone back to the cross-game lobby).
export default function GameMenu({ state, send, isHost = true }: GameMenuProps) {
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

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
          flexWrap: "wrap",
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
        {isHost && (
          <button
            onClick={() => setConfirmSwitch(true)}
            aria-label="Switch game"
            title="Back to game picker"
            style={controlButtonStyle}
          >
            <SwitchIcon />
            <span style={labelStyle}>Switch</span>
          </button>
        )}
      </div>

      {confirmStop && (
        <ConfirmDialog
          title="Stop the game?"
          body="This ends the round and returns everyone to the lobby. Scores and words will be cleared."
          danger
          onCancel={() => setConfirmStop(false)}
          onConfirm={() => {
            send({ type: "resetGame" });
            setConfirmStop(false);
          }}
        />
      )}
      {confirmSwitch && (
        <ConfirmDialog
          title="Switch games?"
          body="This ends the current game for everyone and goes back to the game picker."
          onCancel={() => setConfirmSwitch(false)}
          onConfirm={() => {
            send({ type: "switchGames" });
            setConfirmSwitch(false);
          }}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  body,
  onCancel,
  onConfirm,
  danger,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
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
        <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>{body}</p>
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
              background: danger ? "#c04040" : "var(--accent)",
              color: danger ? "#fff" : "var(--accent-fg)",
            }}
          >
            Confirm
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

function SwitchIcon() {
  // Two arrows swapping — back to picker / change games.
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m17 3 4 4-4 4" />
      <path d="M21 7H9" />
      <path d="m7 21-4-4 4-4" />
      <path d="M3 17h12" />
    </svg>
  );
}
