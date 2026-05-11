import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getClientId } from "../lib/clientId";
import { sounds } from "../lib/sounds";
import { randomName } from "../lib/randomName";
import { AVATARS, randomAvatar } from "../lib/avatars";
import Avatar from "../components/Avatar";
import Honeycomb from "../components/Honeycomb";
import Timer from "../components/Timer";
import PausedOverlay from "../components/PausedOverlay";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import GameMenu from "../components/GameMenu";
import Fireworks from "../components/Fireworks";
import type {
  MathClientMessage,
  MathPrivatePlayerState,
  MathPublicGameState,
  MathServerMessage,
  ScoredEquation,
} from "../shared/math-types";
import type { Player, PublicGameState, RoundConfig } from "../shared/types";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";

const NAME_KEY = "wordhive.name";
const AVATAR_KEY = "wordhive.avatar";

// MathHive uses its own message/state shape, so we drive the WebSocket
// directly here rather than via useRoomSocket (which is typed for word
// state). Same pattern, different types.
function useMathRoomSocket(roomCode: string, role: "host" | "player") {
  const [state, setState] = useState<MathPublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<MathPrivatePlayerState | null>(null);
  const [lastSubmit, setLastSubmit] = useState<{
    equation: string;
    ok: boolean;
    reason?: string;
    points?: number;
    pangram?: boolean;
    firstFinder?: boolean;
    at: number;
  } | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party: "mathhive",
      query: { role },
    });
    const onMsg = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as MathServerMessage;
      switch (msg.type) {
        case "state":
          setState(msg.state);
          break;
        case "private":
          setPrivateState(msg.private);
          break;
        case "submitResult":
          setLastSubmit({
            equation: msg.equation,
            ok: msg.ok,
            reason: msg.reason,
            points: msg.points,
            pangram: msg.pangram,
            firstFinder: msg.firstFinder,
            at: Date.now(),
          });
          break;
      }
    };
    socket.addEventListener("message", onMsg);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.close();
      socketRef.current = null;
    };
  }, [roomCode, role]);

  const send = (msg: MathClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  };
  return { state, privateState, lastSubmit, send };
}

export default function MathPlay() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const { state, privateState, lastSubmit, send } = useMathRoomSocket(roomCode, "player");
  const [clientId] = useState(getClientId);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? randomName());
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem(AVATAR_KEY) ?? randomAvatar(),
  );
  const [joined, setJoined] = useState(false);
  const autoJoinedRef = useRef(false);

  const join = (n: string, a: string) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    localStorage.setItem(AVATAR_KEY, a);
    send({ type: "join", name: trimmed, avatar: a, clientId });
    setJoined(true);
  };

  useEffect(() => {
    if (autoJoinedRef.current || joined || !state) return;
    const existing = state.players.find((p) => p.id === clientId);
    if (existing) {
      autoJoinedRef.current = true;
      join(existing.name, existing.avatar);
    } else if (state.phase !== "LOBBY" && localStorage.getItem(NAME_KEY)) {
      autoJoinedRef.current = true;
      join(localStorage.getItem(NAME_KEY) ?? randomName(), avatar);
    }
  }, [state, joined, clientId]);

  if (!state) {
    return (
      <>
        <GardenBackground />
        <FullscreenButton />
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
          <span style={{ color: "var(--muted)" }}>Connecting...</span>
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
  let view: React.ReactNode = null;
  switch (state.phase) {
    case "LOBBY":
      view = (
        <Lobby
          state={state}
          roomCode={roomCode}
          isHost={isHost}
          clientId={clientId}
          send={send}
        />
      );
      break;
    case "ROUND_STARTING":
      view = <RoundStarting state={state} />;
      break;
    case "ROUND_PLAYING":
      view = (
        <Round
          state={state}
          privateState={privateState}
          lastSubmit={lastSubmit}
          send={send}
        />
      );
      break;
    case "ROUND_RESULTS":
      view = (
        <RoundResults state={state} privateState={privateState} isHost={isHost} send={send} />
      );
      break;
    case "FINAL_RESULTS":
      view = <FinalResults state={state} clientId={clientId} isHost={isHost} send={send} />;
      break;
  }

  // GameMenu expects a wordhive PublicGameState shape; the only fields it
  // actually reads are phase + paused, so we cast.
  const stateForMenu = state as unknown as PublicGameState;
  const disconnected = state.players.filter((p) => !p.connected);
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <GameMenu state={stateForMenu} send={send as unknown as (m: unknown) => void as never} />
      {view}
      {state.paused && (
        <PausedOverlay
          roomCode={roomCode}
          disconnected={disconnected}
          showQR={false}
          game="math"
          onResume={() => send({ type: "togglePause" })}
        />
      )}
    </>
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
    <main style={{ minHeight: "100dvh", padding: "60px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, color: "#6aa6ff" }}>MathHive</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Joining room <strong style={{ color: "var(--fg)" }}>{roomCode}</strong>
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
          style={{ background: "var(--bg)", color: "var(--fg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}
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
                border: a === avatar ? "3px solid #6aa6ff" : "3px solid transparent",
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

function Lobby({
  state,
  roomCode,
  isHost,
  clientId,
  send,
}: {
  state: MathPublicGameState;
  roomCode: string;
  isHost: boolean;
  clientId: string;
  send: (m: MathClientMessage) => void;
}) {
  const cfg = state.config;
  const setCfg = (patch: Partial<RoundConfig>) => send({ type: "configure", config: patch });
  return (
    <main style={{ padding: "60px 20px 24px" }}>
      <h1 style={{ margin: 0, color: "#6aa6ff" }}>MathHive</h1>
      <p style={{ color: "var(--muted)" }}>Room {roomCode}</p>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>
        Players <span style={{ color: "var(--muted)" }}>({state.players.length})</span>
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {state.players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            isHostBadge={state.hostPlayerId === p.id}
            isMe={p.id === clientId}
          />
        ))}
      </ul>
      {isHost ? (
        <>
          <section
            style={{
              marginTop: 24,
              padding: 14,
              border: "1px solid var(--border)",
              borderRadius: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Settings</h3>
            <ConfigRow label="Rounds">
              <Stepper value={cfg.totalRounds} min={1} max={10} onChange={(v) => setCfg({ totalRounds: v })} />
            </ConfigRow>
            <ConfigRow label="Round duration (sec)">
              <Stepper value={cfg.roundDurationSeconds} min={15} max={600} step={15} onChange={(v) => setCfg({ roundDurationSeconds: v })} />
            </ConfigRow>
            <ConfigRow label="Show equations on TV">
              <input
                type="checkbox"
                checked={cfg.easyMode}
                onChange={(e) => setCfg({ easyMode: e.target.checked })}
                style={{ width: 24, height: 24 }}
              />
            </ConfigRow>
          </section>
          <button
            onClick={() => send({ type: "startGame" })}
            disabled={state.players.length === 0}
            style={{ fontSize: 22, padding: 16, marginTop: 16, width: "100%", background: "#6aa6ff", color: "#0a1a2a" }}
          >
            Start Game
          </button>
        </>
      ) : (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>
          Waiting for {state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host"} to start...
        </p>
      )}
    </main>
  );
}

function PlayerRow({
  player,
  isHostBadge,
  isMe,
}: {
  player: Player;
  isHostBadge: boolean;
  isMe: boolean;
}) {
  return (
    <li style={{
      padding: "8px 12px",
      background: "var(--bg-elev)",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      gap: 10,
      opacity: player.connected ? 1 : 0.4,
    }}>
      <Avatar id={player.avatar} size={36} />
      <span style={{ flex: 1 }}>
        {player.name}
        {isMe && <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 13 }}>(you)</span>}
        {isHostBadge && (
          <span style={{ marginLeft: 6, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#6aa6ff", color: "#0a1a2a", fontWeight: 700 }}>
            HOST
          </span>
        )}
      </span>
    </li>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onChange(Math.max(min, value - step))} style={{ padding: "4px 12px" }}>-</button>
      <span style={{ minWidth: 48, textAlign: "center", fontWeight: 700 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} style={{ padding: "4px 12px" }}>+</button>
    </div>
  );
}

function RoundStarting({ state }: { state: MathPublicGameState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(i);
  }, []);
  if (!state.roundStartsAt) return null;
  const remaining = Math.max(0, Math.ceil((state.roundStartsAt - now) / 1000));
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Round {state.currentRound} of {state.config.totalRounds}
        </p>
        <div style={{ fontSize: 200, fontWeight: 800, color: "#6aa6ff", lineHeight: 1 }}>
          {remaining || "GO"}
        </div>
      </div>
    </main>
  );
}

function Round({
  state,
  privateState,
  lastSubmit,
  send,
}: {
  state: MathPublicGameState;
  privateState: MathPrivatePlayerState | null;
  lastSubmit: { equation: string; ok: boolean; reason?: string; points?: number; pangram?: boolean; firstFinder?: boolean; at: number } | null;
  send: (m: MathClientMessage) => void;
}) {
  const puzzle = state.puzzle;
  const [tokens, setTokens] = useState<string[]>([]); // each token is "0"-"9", "+", "-", "*", "/", or "="
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [muted, setMuted] = useState(() => sounds.isMuted());

  useEffect(() => {
    if (!lastSubmit) return;
    if (lastSubmit.ok) {
      if (lastSubmit.pangram) sounds.pangram();
      else sounds.good();
      const tag = `+${lastSubmit.points}${lastSubmit.pangram ? " PANGRAM" : ""}${lastSubmit.firstFinder ? " 1st!" : ""}`;
      setFeedback({ msg: tag, ok: true });
      setTokens([]);
    } else {
      sounds.bad();
      setFeedback({ msg: reasonText(lastSubmit.reason), ok: false });
      setShakeKey((n) => n + 1);
      setTokens([]);
    }
    const t = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(t);
  }, [lastSubmit]);

  if (!puzzle || !state.roundEndsAt) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Loading round...</span>
      </main>
    );
  }

  const center = puzzle.digits[0];
  const outer = puzzle.digits.slice(1);
  const displayLetters = [center, ...outer];

  const tap = (s: string) => {
    if (tokens.length >= 32) return;
    setTokens((arr) => [...arr, s]);
  };
  const backspace = () => setTokens((arr) => arr.slice(0, -1));
  const clear = () => setTokens([]);
  const insertEquals = () => {
    if (tokens.includes("=")) return; // only one equals
    if (tokens.length === 0) return;
    tap("=");
  };
  const submit = () => {
    if (tokens.length === 0) return;
    send({ type: "submitEquation", equation: tokens.join("") });
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sounds.setMuted(next);
  };

  return (
    <main style={{ minHeight: "100dvh", padding: "56px 16px 24px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <style>{`
        @keyframes mh-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
      `}</style>
      <header style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>R{state.currentRound}/{state.config.totalRounds}</span>
        <Timer endsAt={state.roundEndsAt} size={28} />
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={toggleMute} style={{ background: "transparent", color: "var(--muted)", padding: "4px 8px", fontSize: 14 }}>
            sound: {muted ? "off" : "on"}
          </button>
          <span style={{ fontSize: 14 }}>
            <strong>{privateState?.scoreThisRound ?? 0}</strong> pts
          </span>
        </span>
      </header>
      <div
        key={shakeKey}
        style={{
          width: "100%",
          minHeight: 56,
          fontSize: 36,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: 2,
          color: feedback ? (feedback.ok ? "#7fd97f" : "#ff8c8c") : "var(--fg)",
          animation: shakeKey > 0 && feedback && !feedback.ok ? "mh-shake 0.35s ease-out" : undefined,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {feedback ? feedback.msg : tokens.join(" ") || " "}
      </div>
      <Honeycomb
        letters={displayLetters}
        onTap={tap}
        size={Math.min(window.innerWidth - 32, 380)}
        bees={state.bees}
      />
      <div style={{ display: "flex", gap: 6, width: "100%" }}>
        {(["+", "-", "*", "/"] as const).map((op) => (
          <button
            key={op}
            onClick={() => tap(op)}
            style={{ flex: 1, fontSize: 24, padding: "16px 0", background: "var(--bg-elev)", color: "var(--fg)", fontWeight: 700 }}
          >
            {op === "*" ? "×" : op === "/" ? "÷" : op}
          </button>
        ))}
        <button
          onClick={insertEquals}
          disabled={tokens.includes("=") || tokens.length === 0}
          style={{ flex: 1, fontSize: 24, padding: "16px 0", background: "#6aa6ff", color: "#0a1a2a", fontWeight: 800 }}
        >
          =
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button onClick={backspace} disabled={!tokens.length} style={{ flex: 1, fontSize: 14, padding: "10px 0", background: "var(--bg-elev)", color: "var(--fg)" }}>
          Delete
        </button>
        <button onClick={clear} disabled={!tokens.length} style={{ flex: 1, fontSize: 14, padding: "10px 0", background: "var(--bg-elev)", color: "var(--fg)" }}>
          Clear
        </button>
      </div>
      <button
        onClick={submit}
        disabled={!tokens.length}
        style={{
          width: "100%",
          fontSize: 26,
          fontWeight: 800,
          padding: "20px 0",
          background: "#6aa6ff",
          color: "#0a1a2a",
          letterSpacing: 3,
        }}
      >
        ENTER
      </button>
      <FoundList found={privateState?.foundEquations ?? []} />
    </main>
  );
}

function FoundList({ found }: { found: ScoredEquation[] }) {
  if (found.length === 0) {
    return (
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        Tap digits and operators, then = and ENTER.
      </p>
    );
  }
  return (
    <div style={{ width: "100%", marginTop: 12 }}>
      <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 6 }}>
        Found ({found.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[...found].reverse().map((e) => (
          <span
            key={e.equation}
            style={{
              background: e.pangram ? "#6aa6ff" : "var(--bg-elev)",
              color: e.pangram ? "#0a1a2a" : "var(--fg)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 600,
            }}
          >
            {prettyEq(e.equation)} <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>+{e.points}</span>
            {e.firstFinder && <span style={{ marginLeft: 3 }}>★</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoundResults({
  state,
  privateState,
  isHost,
  send,
}: {
  state: MathPublicGameState;
  privateState: MathPrivatePlayerState | null;
  isHost: boolean;
  send: (m: MathClientMessage) => void;
}) {
  const isFinal = state.currentRound >= state.config.totalRounds;
  return (
    <main style={{ padding: "60px 20px 24px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Round {state.currentRound} results</h1>
        {isHost ? (
          <button onClick={() => send({ type: "nextRound" })} style={{ fontSize: 16, padding: "10px 16px", background: "#6aa6ff", color: "#0a1a2a" }}>
            {isFinal ? "Show final →" : "Next round →"}
          </button>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Waiting for host…</span>
        )}
      </header>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        You scored <strong style={{ color: "var(--fg)" }}>{privateState?.scoreThisRound ?? 0}</strong> this round.
      </p>
      <FoundList found={privateState?.foundEquations ?? []} />
    </main>
  );
}

function FinalResults({
  state,
  clientId,
  isHost,
  send,
}: {
  state: MathPublicGameState;
  clientId: string;
  isHost: boolean;
  send: (m: MathClientMessage) => void;
}) {
  const ranked = [...state.players]
    .map((p) => ({ player: p, total: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.total - a.total);
  return (
    <>
      <Fireworks />
      <main style={{ padding: "60px 20px 24px" }}>
        <h1 style={{ marginTop: 0 }}>Final Results</h1>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {ranked.map((r, i) => {
            const isMe = r.player.id === clientId;
            return (
              <li
                key={r.player.id}
                style={{
                  background: isMe ? "#6aa6ff" : "var(--bg-elev)",
                  color: isMe ? "#0a1a2a" : "var(--fg)",
                  padding: "12px 16px",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: isMe ? 700 : 400,
                }}
              >
                <span style={{ opacity: 0.7, minWidth: 20 }}>#{i + 1}</span>
                <Avatar id={r.player.avatar} size={32} />
                <span style={{ flex: 1 }}>
                  {r.player.name}
                  {isMe && <span style={{ marginLeft: 6, fontSize: 13, opacity: 0.8 }}>(you)</span>}
                </span>
                <strong>{r.total}</strong>
              </li>
            );
          })}
        </ol>
        {isHost ? (
          <button onClick={() => send({ type: "playAgain" })} style={{ fontSize: 20, padding: 16, width: "100%", marginTop: 16, background: "#6aa6ff", color: "#0a1a2a" }}>
            Play again
          </button>
        ) : (
          <p style={{ color: "var(--muted)", marginTop: 16 }}>Waiting for host...</p>
        )}
      </main>
    </>
  );
}

function reasonText(r: string | undefined): string {
  switch (r) {
    case "too_short": return "Too short";
    case "missing_center": return `Need center digit`;
    case "invalid_token": return "Invalid";
    case "no_equals": return "Need exactly one =";
    case "two_sides": return "Both sides needed";
    case "no_operator": return "Need an operator";
    case "div_by_zero": return "Divide by zero";
    case "not_equal": return "Sides not equal";
    case "already_found": return "Already found";
    case "not_in_round": return "Round not active";
    default: return "Invalid";
  }
}

function prettyEq(eq: string): string {
  return eq.replace(/\*/g, "×").replace(/\//g, "÷");
}
