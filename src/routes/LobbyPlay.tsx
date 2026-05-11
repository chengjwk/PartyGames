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
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <main style={{ minHeight: "100dvh", padding: "60px 20px 24px" }}>
        <h1 style={{ margin: 0, color: "var(--accent)" }}>Party Games</h1>
        <p style={{ color: "var(--muted)" }}>Room {roomCode}</p>
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

        {isHost ? (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ margin: "0 0 12px" }}>Pick a game</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <GameButton game="word" onPick={() => send({ type: "pickGame", game: "word" })} />
              <GameButton game="math" onPick={() => send({ type: "pickGame", game: "math" })} />
            </div>
          </section>
        ) : (
          <p style={{ color: "var(--muted)", marginTop: 24 }}>
            Waiting for{" "}
            <strong style={{ color: "var(--fg)" }}>
              {state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host"}
            </strong>{" "}
            to pick a game…
          </p>
        )}
      </main>
    </>
  );
}

function GameButton({ game, onPick }: { game: LobbyGame; onPick: () => void }) {
  const isWord = game === "word";
  return (
    <button
      onClick={onPick}
      style={{
        padding: 20,
        borderRadius: 14,
        background: isWord ? "var(--accent)" : "#6aa6ff",
        color: isWord ? "var(--accent-fg)" : "#0a1a2a",
        display: "flex",
        alignItems: "center",
        gap: 16,
        textAlign: "left",
        fontWeight: 700,
        border: "none",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 48 }}>{isWord ? "🐝" : "🧮"}</span>
      <span style={{ flex: 1 }}>
        <div style={{ fontSize: 22 }}>{isWord ? "WordHive" : "MathHive"}</div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.8 }}>
          {isWord
            ? "Honeycomb of letters. Words must use the center letter."
            : "Honeycomb of digits + one operator in the middle."}
        </div>
      </span>
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
