// Pre-game lobby on a phone. Player enters name + avatar, joins, then sees
// either "waiting for host to pick" or (if they are the host) the game
// picker. On game pick the phone navigates to the chosen game's play page;
// the wordhive/mathhive party reconnects with the same clientId from
// localStorage and auto-rejoins as the same player.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";
import { getClientId } from "../lib/clientId";
import { randomName } from "../lib/randomName";
import { AVATARS, randomAvatar } from "../lib/avatars";
import Avatar from "../components/Avatar";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import type {
  LobbyClientMessage,
  LobbyGame,
  LobbyServerMessage,
  LobbyState,
} from "../../party/lobby";

const NAME_KEY = "wordhive.name";
const AVATAR_KEY = "wordhive.avatar";

export default function LobbyPlay() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const [searchParams, setSearchParams] = useSearchParams();
  const wantsReset = searchParams.has("reset");
  const nav = useNavigate();

  const [state, setState] = useState<LobbyState | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const [clientId] = useState(getClientId);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? randomName());
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem(AVATAR_KEY) ?? randomAvatar(),
  );
  const [joined, setJoined] = useState(false);
  const autoJoinedRef = useRef(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party: "lobby",
      query: { role: "player" },
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

  const send = (msg: LobbyClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  };

  const join = (n: string, a: string) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    localStorage.setItem(AVATAR_KEY, a);
    send({ type: "join", name: trimmed, avatar: a, clientId });
    setJoined(true);
  };

  // Auto-rejoin on reload if the server still has us.
  useEffect(() => {
    if (autoJoinedRef.current || joined || !state) return;
    const existing = state.players.find((p) => p.id === clientId);
    if (existing) {
      autoJoinedRef.current = true;
      join(existing.name, existing.avatar);
    }
  }, [state, joined, clientId]);

  // Coming back from a running game with ?reset=1: clear the lobby's
  // chosenGame so we land on the picker rather than auto-bouncing back.
  useEffect(() => {
    if (wantsReset && state && !resetSent) {
      socketRef.current?.send(JSON.stringify({ type: "resetChoice" }));
      setResetSent(true);
      const next = new URLSearchParams(searchParams);
      next.delete("reset");
      setSearchParams(next, { replace: true });
    }
  }, [wantsReset, state, resetSent, searchParams, setSearchParams]);

  // When the host picks a game, hop to that game's play page. Same clientId
  // + name + avatar are in localStorage, so the game party auto-rejoins us
  // without re-entry.
  useEffect(() => {
    if (wantsReset && !resetSent) return;
    if (state?.chosenGame) {
      nav(`/play/${state.chosenGame}/${roomCode}`, { replace: true });
    }
  }, [state?.chosenGame, roomCode, nav, wantsReset, resetSent]);

  if (!state) {
    return (
      <>
        <GardenBackground />
        <FullscreenButton />
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "var(--muted)" }}>
          Connecting...
        </main>
      </>
    );
  }

  if (!joined) {
    return (
      <>
        <GardenBackground />
        <FullscreenButton />
        <NameEntry
          roomCode={roomCode}
          name={name}
          setName={setName}
          avatar={avatar}
          setAvatar={setAvatar}
          onJoin={() => join(name, avatar)}
        />
      </>
    );
  }

  const isHost = state.hostPlayerId === clientId;
  const hostName = state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host";
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <style>{`
        @keyframes flower-sway-a {
          0%, 100% { transform: rotate(-2.5deg); }
          50%      { transform: rotate(2.5deg); }
        }
        @keyframes flower-sway-b {
          0%, 100% { transform: rotate(2deg); }
          50%      { transform: rotate(-2deg); }
        }
        @keyframes flower-bloom {
          0%   { transform: scale(0.85); }
          50%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      <main
        style={{
          minHeight: "100dvh",
          padding: "60px 20px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1 style={{ margin: 0, color: "var(--accent)" }}>Party Games</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>Room {roomCode}</p>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>
          Players <span style={{ color: "var(--muted)" }}>({state.players.length})</span>
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {state.players.map((p) => (
            <li
              key={p.id}
              style={{
                padding: "8px 12px",
                background: "var(--bg-elev)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: p.connected ? 1 : 0.4,
              }}
            >
              <Avatar id={p.avatar} size={36} />
              <span style={{ flex: 1 }}>
                {p.name}
                {p.id === clientId && (
                  <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 13 }}>(you)</span>
                )}
                {state.hostPlayerId === p.id && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
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

        {/* Spacer pushes the garden patch toward the bottom of the
            viewport so the flowers visually grow up out of the BG grass. */}
        <div style={{ flex: 1, minHeight: 24 }} />

        <section style={{ paddingBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px", textAlign: "center", color: "var(--fg)" }}>
            {isHost ? "Pick a game" : `${hostName} is picking…`}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              justifyItems: "center",
              alignItems: "end",
            }}
          >
            <FlowerButton
              game="word"
              swayKeyframes="flower-sway-a"
              disabled={!isHost}
              onPick={() => send({ type: "pickGame", game: "word" })}
            />
            <FlowerButton
              game="math"
              swayKeyframes="flower-sway-b"
              disabled={!isHost}
              onPick={() => send({ type: "pickGame", game: "math" })}
            />
          </div>
        </section>
      </main>
    </>
  );
}

// Flower-shaped game button. Petals + leaf + stem + center disc with the
// game emoji. Color of the petals identifies the game; geometry matches
// the GardenBackground's flower style so the picker reads as part of
// the same garden scene. Gently sways. Disabled state (non-host) keeps
// the flower visible but desaturated and unclickable.
function FlowerButton({
  game,
  onPick,
  swayKeyframes,
  disabled,
}: {
  game: LobbyGame;
  onPick: () => void;
  swayKeyframes: string;
  disabled: boolean;
}) {
  const isWord = game === "word";
  // Petal colors — yellow for the bee game (matches WordHive --accent),
  // soft blue for math (matches the MathHive accent).
  const petalColor = isWord ? "#f7d56e" : "#9ec3ff";
  const petalHighlight = isWord ? "#fbe89a" : "#c5d9ff";
  const emoji = isWord ? "🐝" : "🧮";
  const label = isWord ? "WordHive" : "MathHive";
  const tagline = isWord ? "Spell with the bees" : "Solve the number";

  // Geometry
  const PETAL_R = 28;
  const RING_R = 30;
  const CENTER_R = 24;
  const STEM_LEN = 96;
  const W = 2 * (RING_R + PETAL_R) + 12;
  const H = STEM_LEN + RING_R + PETAL_R + 8;

  return (
    <button
      onClick={disabled ? undefined : onPick}
      disabled={disabled}
      aria-label={`Pick ${label}`}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? "saturate(0.6)" : undefined,
        transition: "opacity 0.2s",
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`${-W / 2} ${-H} ${W} ${H}`}
        aria-hidden
        style={{
          // Sway origin at the bottom of the stem so the flower head
          // rocks gently like a real flower in a breeze.
          transformBox: "fill-box",
          transformOrigin: "50% 100%",
          animation: `${swayKeyframes} 4.5s ease-in-out infinite, flower-bloom 0.5s ease-out`,
          overflow: "visible",
        }}
      >
        {/* Stem */}
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-STEM_LEN}
          stroke="#244022"
          strokeWidth={5}
          strokeLinecap="round"
        />
        {/* Leaf */}
        <ellipse
          cx={14}
          cy={-STEM_LEN * 0.45}
          rx={18}
          ry={9}
          fill="#345e30"
          stroke="#1c3a1c"
          strokeWidth={1.5}
          transform={`rotate(35 14 ${-STEM_LEN * 0.45})`}
        />
        {/* Petals */}
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
                strokeWidth={1.5}
              />
              {/* Subtle highlight on each petal for depth */}
              <circle
                cx={RING_R * Math.cos(a) - PETAL_R * 0.3}
                cy={-STEM_LEN + RING_R * Math.sin(a) - PETAL_R * 0.3}
                r={PETAL_R * 0.35}
                fill={petalHighlight}
                opacity={0.55}
              />
            </g>
          );
        })}
        {/* Center disc with game emoji */}
        <circle
          cx={0}
          cy={-STEM_LEN}
          r={CENTER_R}
          fill="#f4cd44"
          stroke="#3a2a14"
          strokeWidth={2}
        />
        <text
          x={0}
          y={-STEM_LEN + 2}
          fontSize={CENTER_R * 1.3}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ userSelect: "none" }}
        >
          {emoji}
        </text>
      </svg>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg)", marginTop: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          textAlign: "center",
          padding: "0 6px",
          lineHeight: 1.3,
          maxWidth: 150,
        }}
      >
        {tagline}
      </div>
    </button>
  );
}

function NameEntry({
  roomCode,
  name,
  setName,
  avatar,
  setAvatar,
  onJoin,
}: {
  roomCode: string;
  name: string;
  setName: (s: string) => void;
  avatar: string;
  setAvatar: (a: string) => void;
  onJoin: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "60px 20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h1 style={{ margin: 0 }}>Join the lobby</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Room <strong style={{ color: "var(--fg)" }}>{roomCode}</strong>
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 12,
          background: "var(--bg-elev)",
          borderRadius: 12,
        }}
      >
        <Avatar id={avatar} size={64} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          style={{ fontSize: 22, padding: 12, flex: 1, minWidth: 0 }}
        />
        <button
          onClick={() => setName(randomName())}
          aria-label="Random name"
          style={{
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          🎲
        </button>
      </div>
      <div>
        <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 8 }}>Pick an avatar</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              style={{
                background: "transparent",
                padding: 4,
                aspectRatio: "1/1",
                borderRadius: 12,
                border: a === avatar ? "3px solid var(--accent)" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Avatar id={a} />
            </button>
          ))}
        </div>
      </div>
      <button onClick={onJoin} disabled={!name.trim()} style={{ fontSize: 22, padding: 16 }}>
        Join
      </button>
    </main>
  );
}
