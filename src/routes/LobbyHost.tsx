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
        @keyframes flower-sway-a {
          0%, 100% { transform: rotate(-2.5deg); }
          50%      { transform: rotate(2.5deg); }
        }
        @keyframes flower-sway-b {
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
            <DisplayFlower kind="word" swayKeyframes="flower-sway-a" />
            <DisplayFlower kind="math" swayKeyframes="flower-sway-b" />
          </div>
        </section>
      </main>
    </>
  );
}

// TV-side decorative flower. Mirrors the phone picker's flower so the
// host's TV shows what's available. Not interactive — the host picks
// from their phone.
function DisplayFlower({
  kind,
  swayKeyframes,
}: {
  kind: "word" | "math";
  swayKeyframes: string;
}) {
  const isWord = kind === "word";
  const petalColor = isWord ? "#f7d56e" : "#9ec3ff";
  const petalHighlight = isWord ? "#fbe89a" : "#c5d9ff";
  const emoji = isWord ? "🐝" : "🧮";
  const label = isWord ? "WordHive" : "MathHive";
  // Bigger than the phone flower — TV-scale.
  const PETAL_R = 46;
  const RING_R = 50;
  const CENTER_R = 40;
  const STEM_LEN = 180;
  const W = 2 * (RING_R + PETAL_R) + 16;
  const H = STEM_LEN + RING_R + PETAL_R + 12;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg
        width={W}
        height={H}
        viewBox={`${-W / 2} ${-H} ${W} ${H}`}
        aria-hidden
        style={{
          transformBox: "fill-box",
          transformOrigin: "50% 100%",
          animation: `${swayKeyframes} 4.5s ease-in-out infinite`,
          overflow: "visible",
        }}
      >
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-STEM_LEN}
          stroke="#244022"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <ellipse
          cx={24}
          cy={-STEM_LEN * 0.45}
          rx={30}
          ry={15}
          fill="#345e30"
          stroke="#1c3a1c"
          strokeWidth={2}
          transform={`rotate(35 24 ${-STEM_LEN * 0.45})`}
        />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
          return (
            <g key={i}>
              <circle
                cx={RING_R * Math.cos(a)}
                cy={-STEM_LEN + RING_R * Math.sin(a)}
                r={PETAL_R}
                fill={petalColor}
                stroke="#3a2a14"
                strokeWidth={2.5}
              />
              <circle
                cx={RING_R * Math.cos(a) - PETAL_R * 0.3}
                cy={-STEM_LEN + RING_R * Math.sin(a) - PETAL_R * 0.3}
                r={PETAL_R * 0.35}
                fill={petalHighlight}
                opacity={0.6}
              />
            </g>
          );
        })}
        <circle
          cx={0}
          cy={-STEM_LEN}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={3}
        />
        <text
          x={0}
          y={-STEM_LEN + 4}
          fontSize={CENTER_R * 1.3}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ userSelect: "none" }}
        >
          {emoji}
        </text>
      </svg>
      <div style={{ fontSize: 32, fontWeight: 700, color: "var(--fg)", marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}
