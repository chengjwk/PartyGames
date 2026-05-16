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
import LilyFlower from "../components/LilyFlower";
import ThemeToggle from "../components/ThemeToggle";
import { requestFullscreenIfMobile } from "../lib/fullscreen";
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
  const [connectionEpoch, setConnectionEpoch] = useState(0);
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
    const onOpen = () => setConnectionEpoch((e) => e + 1);
    socket.addEventListener("message", onMsg);
    socket.addEventListener("open", onOpen);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.removeEventListener("open", onOpen);
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

  // Reconnect handler — re-send join on every socket re-open so the
  // server reassociates the new connection with our clientId. Otherwise
  // taps (e.g., pickGame) silently no-op after a phone-lock or network
  // blip until the page is reloaded.
  useEffect(() => {
    if (connectionEpoch <= 1) return;
    const savedName = localStorage.getItem(NAME_KEY);
    if (!savedName || !clientId) return;
    const savedAvatar = localStorage.getItem(AVATAR_KEY) ?? "fox";
    send({ type: "join", name: savedName, avatar: savedAvatar, clientId });
  }, [connectionEpoch]);

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
        <ThemeToggle />
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
        <ThemeToggle />
        <NameEntry
          roomCode={roomCode}
          name={name}
          setName={setName}
          avatar={avatar}
          setAvatar={setAvatar}
          onJoin={() => {
            // Must be in a user-gesture stack for the browser to allow it.
            requestFullscreenIfMobile();
            join(name, avatar);
          }}
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
      <ThemeToggle />
      <style>{`
        @keyframes lily-sway-a {
          0%, 100% { transform: rotate(-2.5deg); }
          50%      { transform: rotate(2.5deg); }
        }
        @keyframes lily-sway-b {
          0%, 100% { transform: rotate(2deg); }
          50%      { transform: rotate(-2deg); }
        }
        @keyframes lily-bloom {
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
              swayKeyframes="lily-sway-a"
              disabled={!isHost}
              onPick={() => send({ type: "pickGame", game: "word" })}
            />
            <FlowerButton
              game="math"
              swayKeyframes="lily-sway-b"
              disabled={!isHost}
              onPick={() => send({ type: "pickGame", game: "math" })}
            />
          </div>
        </section>
      </main>
    </>
  );
}

// Game-picker flower — lily-shaped tappable button. WordHive blooms a
// little taller than MathHive so they don't look like clones; both grow
// up from the same ground line (alignItems: "end" on the grid).
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
  // Petal colors — honey-yellow for the bee game, soft blue for math.
  const petalColor = isWord ? "#f7c84a" : "#7fb3ff";
  const petalHighlight = isWord ? "#ffe28a" : "#b9d3ff";
  const emoji = isWord ? "🐝" : "🧮";
  const label = isWord ? "WordHive" : "MathHive";
  const tagline = isWord ? "Spell with the bees" : "Solve the number";
  // Different stem heights so the two flowers feel like distinct plants
  // rather than mirror images. WordHive (older) blooms a bit taller.
  const stemLength = isWord ? 130 : 96;

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
      <LilyFlower
        petalColor={petalColor}
        petalHighlight={petalHighlight}
        stemLength={stemLength}
        scale={0.9}
        swayKeyframes={swayKeyframes}
        bloomIn
        centerContent={
          <text
            x={0}
            y={0}
            fontSize={20}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ userSelect: "none" }}
          >
            {emoji}
          </text>
        }
      />
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
