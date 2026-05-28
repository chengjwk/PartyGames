// Pre-game lobby on the host display (laptop / TV). Shows the QR code,
// list of joined players, and a waiting message. The host PLAYER (first to
// join) picks the game from their phone; when they do, this page navigates
// to the chosen game's host page.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";
import Avatar from "../components/Avatar";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import SoundUnlockPrompt from "../components/SoundUnlockPrompt";
import GardenPicker from "../components/GardenPicker";
import ThemeToggle from "../components/ThemeToggle";
import type {
  LobbyServerMessage,
  LobbyState,
} from "../../party/lobby";

export default function LobbyHost() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const [searchParams, setSearchParams] = useSearchParams();
  const wantsReset = searchParams.has("reset");
  const nav = useNavigate();
  const [state, setState] = useState<LobbyState | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party: "lobby",
      query: { role: "host" },
    });
    const onMsg = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as LobbyServerMessage;
      if (msg.type === "state") setState(msg.state);
    };
    socket.addEventListener("message", onMsg);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.close();
    };
  }, [roomCode]);

  // Coming back from a running game with ?reset=1: clear the lobby's
  // chosenGame so we land on the picker, not auto-bounce to the game.
  useEffect(() => {
    if (wantsReset && state && !resetSent) {
      socketRef.current?.send(JSON.stringify({ type: "resetChoice" }));
      setResetSent(true);
      // Strip the param so a refresh doesn't keep resetting.
      const next = new URLSearchParams(searchParams);
      next.delete("reset");
      setSearchParams(next, { replace: true });
    }
  }, [wantsReset, state, resetSent, searchParams, setSearchParams]);

  // When the host picks a game, navigate every viewer (including this TV)
  // to that game's host page. Skip while we're still flushing a reset.
  useEffect(() => {
    if (wantsReset && !resetSent) return;
    if (state?.chosenGame) {
      nav(`/host/${state.chosenGame}/${roomCode}`, { replace: true });
    }
  }, [state?.chosenGame, roomCode, nav, wantsReset, resetSent]);

  const playUrl = `${window.location.origin}/play/${roomCode}`;

  const hostName = state?.players.find((p) => p.id === state?.hostPlayerId)?.name ?? null;
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <ThemeToggle />
      <SoundUnlockPrompt />
      <style>{`
        @keyframes lily-sway-a {
          0%, 100% { transform: rotate(-2.5deg); }
          50%      { transform: rotate(2.5deg); }
        }
        @keyframes lily-sway-b {
          0%, 100% { transform: rotate(2deg); }
          50%      { transform: rotate(-2deg); }
        }
        @keyframes lily-sway-c {
          0%, 100% { transform: rotate(-1.8deg); }
          50%      { transform: rotate(2.8deg); }
        }
      `}</style>
      <main
        style={{
          minHeight: "100dvh",
          padding: "24px 32px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top row: QR + room code in a compact left column, title +
            players list filling the rest on the right. Previous
            layout used a 1fr/1fr grid that gave the QR half the
            screen and pushed the players list off the bottom. */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: "white",
                padding: 10,
                borderRadius: 10,
                display: "inline-block",
              }}
            >
              <QRCodeSVG value={playUrl} size={180} />
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: 8, lineHeight: 1 }}>
              {roomCode}
            </div>
            <div style={{ fontFamily: "monospace", color: "var(--muted)", fontSize: 12 }}>
              {playUrl}
            </div>
          </section>

          <section style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 56, margin: 0 }}>Party Games</h1>
            <p style={{ color: "var(--muted)", margin: "4px 0 16px" }}>
              Scan to join
            </p>
            <h2 style={{ fontSize: 28, margin: "0 0 8px" }}>
              Players{" "}
              <span style={{ color: "var(--muted)" }}>
                ({state?.players.length ?? 0})
              </span>
            </h2>
            {(!state || state.players.length === 0) && (
              <p style={{ color: "var(--muted)", margin: 0 }}>
                Waiting for players to join…
              </p>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {state?.players.map((p) => (
                <li
                  key={p.id}
                  style={{
                    fontSize: 20,
                    padding: "8px 12px",
                    background: "var(--bg-elev)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: p.connected ? 1 : 0.4,
                  }}
                >
                  <Avatar id={p.avatar} size={48} />
                  <span style={{ flex: 1 }}>
                    {p.name}
                    {state.hostPlayerId === p.id && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--accent)",
                          color: "var(--accent-fg)",
                          fontWeight: 700,
                        }}
                      >
                        HOST
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Spacer pushes the garden picker to sit on the BG grass line. */}
        <div style={{ flex: 1, minHeight: 24 }} />

        <section
          aria-hidden
          style={{
            paddingBottom: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--fg)", margin: "0 0 12px", fontSize: 24, fontWeight: 600 }}>
            {hostName ? `${hostName} is picking a game…` : "Waiting for first player to join."}
          </p>
          <GardenPicker
            isHost={false}
            compact={false}
            onPick={() => {
              /* TV is non-interactive — picking happens on the phone. */
            }}
          />
        </section>
      </main>
    </>
  );
}
