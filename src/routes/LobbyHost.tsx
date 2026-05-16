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
import LilyFlower from "../components/LilyFlower";
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
      `}</style>
      <main
        style={{
          minHeight: "100dvh",
          padding: "24px 32px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "center",
          }}
        >
          <section style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 56, margin: 0 }}>Party Games</h1>
            <p style={{ color: "var(--muted)", marginTop: 4 }}>Scan to join</p>
            <div
              style={{
                background: "white",
                padding: 16,
                borderRadius: 12,
                display: "inline-block",
                marginTop: 16,
              }}
            >
              <QRCodeSVG value={playUrl} size={256} />
            </div>
            <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: 12, marginTop: 16 }}>
              {roomCode}
            </div>
            <div style={{ fontFamily: "monospace", color: "var(--muted)" }}>{playUrl}</div>
          </section>

          <section>
            <h2 style={{ fontSize: 32, marginTop: 0 }}>
              Players <span style={{ color: "var(--muted)" }}>({state?.players.length ?? 0})</span>
            </h2>
            {(!state || state.players.length === 0) && (
              <p style={{ color: "var(--muted)" }}>Waiting for players to join…</p>
            )}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {state?.players.map((p) => (
                <li
                  key={p.id}
                  style={{
                    fontSize: 22,
                    padding: "10px 14px",
                    background: "var(--bg-elev)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: p.connected ? 1 : 0.4,
                  }}
                >
                  <Avatar id={p.avatar} size={64} />
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
          <div
            style={{
              display: "flex",
              gap: 80,
              justifyContent: "center",
              alignItems: "end",
            }}
          >
            <DisplayFlower kind="word" swayKeyframes="lily-sway-a" />
            <DisplayFlower kind="math" swayKeyframes="lily-sway-b" />
          </div>
        </section>
      </main>
    </>
  );
}

// TV-side decorative lily. Mirrors the phone picker's flower at TV scale
// so the host's display shows the same garden patch as their phone. Not
// interactive — picking happens on the phone. WordHive blooms taller
// than MathHive to match the phone version's height contrast.
function DisplayFlower({
  kind,
  swayKeyframes,
}: {
  kind: "word" | "math";
  swayKeyframes: string;
}) {
  const isWord = kind === "word";
  const petalColor = isWord ? "#f7c84a" : "#7fb3ff";
  const petalHighlight = isWord ? "#ffe28a" : "#b9d3ff";
  const emoji = isWord ? "🐝" : "🧮";
  const label = isWord ? "WordHive" : "MathHive";
  const stemLength = isWord ? 240 : 175;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <LilyFlower
        petalColor={petalColor}
        petalHighlight={petalHighlight}
        stemLength={stemLength}
        scale={1.7}
        swayKeyframes={swayKeyframes}
        centerContent={
          <text
            x={0}
            y={0}
            fontSize={42}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ userSelect: "none" }}
          >
            {emoji}
          </text>
        }
      />
      <div style={{ fontSize: 32, fontWeight: 700, color: "var(--fg)", marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}
