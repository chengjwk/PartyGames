// MathPlay (v2) — Digits-style tap-to-combine UX.
//
// The player sees one target at a time plus a shared pool of 6 digits.
// Tap a tile + an operator + another tile → the two source tiles are
// consumed, a new derived tile appears with their combined value. When
// any alive tile equals the target, "Submit" lights up. Submission sends
// the lineage of steps that produced that tile.
//
// Each tile carries its own self-contained `steps[]` array — the indexes
// within those steps refer only to that array, never to a shared global
// list. Combining two tiles produces a new steps array by concatenating
// (shifting the right side's step refs) and appending the final op.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClientId } from "../lib/clientId";
import { sounds } from "../lib/sounds";
import { randomName } from "../lib/randomName";
import { AVATARS, randomAvatar } from "../lib/avatars";
import { requestFullscreenIfMobile } from "../lib/fullscreen";
import Avatar from "../components/Avatar";
import Timer from "../components/Timer";
import PausedOverlay from "../components/PausedOverlay";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import GameMenu from "../components/GameMenu";
import Fireworks from "../components/Fireworks";
import BuiltHive from "../components/BuiltHive";
import type {
  MathClientMessage,
  MathDifficulty,
  MathOperator,
  MathPrivatePlayerState,
  MathPublicGameState,
  MathServerMessage,
  MathSolveStep,
  MathSolvedRecord,
} from "../shared/math-types";
import type { Player, PublicGameState, RoundConfig } from "../shared/types";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";

const NAME_KEY = "wordhive.name";
const AVATAR_KEY = "wordhive.avatar";

const ACCENT = "#6aa6ff";
const ACCENT_FG = "#0a1a2a";
const GOOD = "#7fd97f";
const BAD = "#ff8c8c";
// Pool tiles use a slightly lighter shade of WordHive's --accent (#f5b400)
// so the original digits read as "the bees' tiles" while derived tiles
// stay blue. Dark text for contrast on the warm yellow.
const POOL_FILL = "#f7c850";
const POOL_TEXT = "#1a1a1f";

const OP_GLYPH: Record<MathOperator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function useMathRoomSocket(roomCode: string, role: "host" | "player") {
  const [state, setState] = useState<MathPublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<MathPrivatePlayerState | null>(null);
  const [switchAt, setSwitchAt] = useState<number | null>(null);
  const [lastSolveResult, setLastSolveResult] = useState<
    | { targetId: string; ok: boolean; reason?: string; points?: number; allSix?: boolean; solveMs?: number; at: number }
    | null
  >(null);
  // Increments on every (re)connect. Player route watches this to
  // re-send `join` after a socket drop — without that the new
  // connection has no clientId mapping on the server and taps no-op.
  const [connectionEpoch, setConnectionEpoch] = useState(0);
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
        case "solveResult":
          setLastSolveResult({
            targetId: msg.targetId,
            ok: msg.ok,
            reason: msg.reason,
            points: msg.points,
            allSix: msg.allSix,
            solveMs: msg.solveMs,
            at: Date.now(),
          });
          break;
        case "switchGames":
          setSwitchAt(Date.now());
          break;
      }
    };
    const onOpen = () => setConnectionEpoch((e) => e + 1);
    socket.addEventListener("message", onMsg);
    socket.addEventListener("open", onOpen);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.removeEventListener("open", onOpen);
      socket.close();
      socketRef.current = null;
    };
  }, [roomCode, role]);

  const send = (msg: MathClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  };
  return { state, privateState, lastSolveResult, switchAt, send, connectionEpoch };
}

export default function MathPlay() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const { state, privateState, lastSolveResult, send, switchAt, connectionEpoch } =
    useMathRoomSocket(roomCode, "player");
  const nav = useNavigate();
  useEffect(() => {
    if (switchAt) nav(`/play/${roomCode}?reset=1`, { replace: true });
  }, [switchAt, roomCode, nav]);
  const [clientId] = useState(getClientId);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? randomName());
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem(AVATAR_KEY) ?? randomAvatar(),
  );
  const [joined, setJoined] = useState(false);
  const autoJoinedRef = useRef(false);
  // Total pool-digits the player has contributed to "the hive" across the
  // current game. Persists across rounds (so the player sees one growing
  // hive over multiple rounds); resets when the game ends and they return
  // to the lobby.
  const [hiveHexes, setHiveHexes] = useState(0);

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
    const savedName = localStorage.getItem(NAME_KEY);
    if (existing) {
      autoJoinedRef.current = true;
      join(existing.name, existing.avatar);
    } else if (savedName) {
      autoJoinedRef.current = true;
      join(savedName, avatar);
    }
  }, [state, joined, clientId]);

  // Hive resets when a fresh game starts — phase goes back to LOBBY (either
  // first ever arrival or after Play Again).
  useEffect(() => {
    if (state?.phase === "LOBBY") setHiveHexes(0);
  }, [state?.phase]);

  // Reconnect handler — re-send join on every socket re-open so the
  // server reassociates the new connection with our clientId. Without
  // this, taps after a reconnect (phone lock, network blip) silently
  // do nothing on the server and the player has to pause + reload.
  useEffect(() => {
    if (connectionEpoch <= 1) return;
    const savedName = localStorage.getItem(NAME_KEY);
    if (!savedName || !clientId) return;
    const savedAvatar = localStorage.getItem(AVATAR_KEY) ?? "fox";
    send({ type: "join", name: savedName, avatar: savedAvatar, clientId });
  }, [connectionEpoch]);

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
          onJoin={() => {
            requestFullscreenIfMobile();
            join(name, avatar);
          }}
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
          lastSolveResult={lastSolveResult}
          send={send}
          hiveHexes={hiveHexes}
          addHiveHexes={(n) => setHiveHexes((c) => c + n)}
        />
      );
      break;
    case "ROUND_RESULTS":
      view = (
        <RoundResults
          state={state}
          privateState={privateState}
          isHost={isHost}
          send={send}
        />
      );
      break;
    case "FINAL_RESULTS":
      view = <FinalResults state={state} clientId={clientId} isHost={isHost} send={send} />;
      break;
  }

  const stateForMenu = state as unknown as PublicGameState;
  const disconnected = state.players.filter((p) => !p.connected);
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <GameMenu state={stateForMenu} send={send as unknown as (m: unknown) => void as never} isHost={isHost} />
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
      <h1 style={{ margin: 0, color: ACCENT }}>MathHive</h1>
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
                border: a === avatar ? `3px solid ${ACCENT}` : "3px solid transparent",
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
      <h1 style={{ margin: 0, color: ACCENT }}>MathHive</h1>
      <p style={{ color: "var(--muted)" }}>Room {roomCode}</p>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>
        Players <span style={{ color: "var(--muted)" }}>({state.players.length})</span>
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {state.players.map((p) => {
          const effDiff = (p.mathDifficulty ?? cfg.mathDifficulty) as MathDifficulty;
          return (
            <PlayerRow
              key={p.id}
              player={p}
              isHostBadge={state.hostPlayerId === p.id}
              isMe={p.id === clientId}
              effectiveDifficulty={effDiff}
              hasOverride={!!p.mathDifficulty}
              canSetDifficulty={isHost}
              onSetDifficulty={(d) =>
                send({
                  type: "setPlayerMathDifficulty",
                  playerId: p.id,
                  difficulty: d,
                })
              }
            />
          );
        })}
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
            <ConfigRow label="Difficulty">
              <DifficultyPicker value={cfg.mathDifficulty} onChange={(d) => setCfg({ mathDifficulty: d })} />
            </ConfigRow>
          </section>
          <button
            onClick={() => send({ type: "startGame" })}
            disabled={state.players.length === 0}
            style={{ fontSize: 22, padding: 16, marginTop: 16, width: "100%", background: ACCENT, color: ACCENT_FG }}
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

function DifficultyPicker({
  value,
  onChange,
}: {
  value: MathDifficulty;
  onChange: (d: MathDifficulty) => void;
}) {
  const options: { id: MathDifficulty; label: string }[] = [
    { id: "easy", label: "Easy +−" },
    { id: "medium", label: "Medium ×÷" },
    // Hard ships in v1.1 (auto-reroll). Keep it disabled but visible so the
    // option doesn't appear out of nowhere later.
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            padding: "6px 12px",
            background: value === o.id ? ACCENT : "var(--bg-elev)",
            color: value === o.id ? ACCENT_FG : "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PlayerRow({
  player,
  isHostBadge,
  isMe,
  effectiveDifficulty,
  hasOverride,
  canSetDifficulty,
  onSetDifficulty,
}: {
  player: Player;
  isHostBadge: boolean;
  isMe: boolean;
  effectiveDifficulty: MathDifficulty;
  // True if this row has a per-player override (so we can show a
  // "clear override" affordance).
  hasOverride: boolean;
  canSetDifficulty: boolean;
  onSetDifficulty: (d: MathDifficulty | null) => void;
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
      flexWrap: "wrap",
    }}>
      <Avatar id={player.avatar} size={36} />
      <span style={{ flex: 1, minWidth: 0 }}>
        {player.name}
        {isMe && <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 13 }}>(you)</span>}
        {isHostBadge && (
          <span style={{ marginLeft: 6, fontSize: 11, padding: "2px 6px", borderRadius: 4, background: ACCENT, color: ACCENT_FG, fontWeight: 700 }}>
            HOST
          </span>
        )}
      </span>
      {canSetDifficulty ? (
        <PerPlayerDifficultyPicker
          value={effectiveDifficulty}
          overridden={hasOverride}
          onChange={(d) => onSetDifficulty(d)}
        />
      ) : (
        <span
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          {effectiveDifficulty}
        </span>
      )}
    </li>
  );
}

// Tiny inline difficulty picker for the host to set per-player
// overrides. Tapping the same difficulty twice clears the override
// (reverts to room default).
function PerPlayerDifficultyPicker({
  value,
  overridden,
  onChange,
}: {
  value: MathDifficulty;
  overridden: boolean;
  onChange: (d: MathDifficulty | null) => void;
}) {
  const opts: { id: MathDifficulty; label: string }[] = [
    { id: "easy", label: "E" },
    { id: "medium", label: "M" },
  ];
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(active && overridden ? null : o.id)}
            title={
              active
                ? overridden
                  ? `Clear override (back to room default)`
                  : `Already on ${o.label === "E" ? "Easy" : "Medium"}`
                : `Set this player to ${o.label === "E" ? "Easy" : "Medium"}`
            }
            style={{
              width: 26,
              height: 22,
              padding: 0,
              fontSize: 11,
              fontWeight: 700,
              background: active ? ACCENT : "var(--bg)",
              color: active ? ACCENT_FG : "var(--fg)",
              border: overridden && active ? "1.5px solid var(--fg)" : "1px solid var(--border)",
              borderRadius: 5,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
        <div style={{ fontSize: 200, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
          {remaining || "GO"}
        </div>
      </div>
    </main>
  );
}

// ───────── Round (the heart of the game) ─────────

// A tile in the player's workspace. Pool tiles are the original 6 digits;
// derived tiles are produced by combining other tiles. Each tile carries
// the full step lineage that produced it — submitting just sends the
// claimed tile's `steps`.
//
// Pool tiles have a fixed hex slot (their position in the bottom-of-screen
// honeycomb cluster). When consumed they leave a visible empty placeholder
// in that slot — the player can always see which originals they've used.
// Derived tiles live in a separate area above the pool and have no fixed
// slot; they're rendered in creation order as a row.
interface PoolTile {
  kind: "pool";
  id: string;
  poolSlot: number; // 0..5 — hex position in the bottom pool grid
  poolIndex: number; // 0..5 — index into the original digit pool
  value: number;
  steps: MathSolveStep[];
}
interface DerivedTile {
  kind: "derived";
  id: string;
  // 0..2 — slot in the derived row (above the pool top row). Assigned at
  // creation by picking the lowest currently-free slot, so derived tiles
  // tend to stay in stable positions across combines.
  derivedSlot: number;
  value: number;
  steps: MathSolveStep[];
  // Marks "I was just created" — for animation purposes.
  freshUntil: number;
}
type Tile = PoolTile | DerivedTile;

function makePoolTiles(digits: string[]): PoolTile[] {
  return digits.map((d, i) => ({
    kind: "pool",
    id: `p${i}`,
    poolSlot: i,
    poolIndex: i,
    value: Number(d),
    steps: [],
  }));
}

// Combine two tiles with an operator, producing the next-step tile + the
// new steps array that produces it. Result may be null if the math is
// invalid (e.g., divide by zero or non-integer division).
//
// `derivedSlot` is the row -1 hex slot the new tile will occupy. The
// caller picks it from the lowest-free slot among currently-alive
// derived tiles (excluding the ones about to be consumed).
function combineTiles(
  left: Tile,
  right: Tile,
  op: MathOperator,
  idCounter: { current: number },
  derivedSlot: number,
): DerivedTile | { error: string } {
  // Treat − and ÷ as commutative-with-swap: tile order doesn't matter,
  // and we auto-orient so subtraction yields a non-negative result and
  // division puts the larger value over the smaller. Verifier on the
  // server applies the same semantics — the step's recorded left/right
  // are the original tap order; both ends evaluate identically.
  let v: number;
  switch (op) {
    case "+":
      v = left.value + right.value;
      break;
    case "-":
      v = Math.abs(left.value - right.value);
      break;
    case "*":
      v = left.value * right.value;
      break;
    case "/": {
      const big = Math.max(left.value, right.value);
      const small = Math.min(left.value, right.value);
      if (small === 0) return { error: "÷ by 0" };
      if (big % small !== 0) return { error: "not whole" };
      v = big / small;
      break;
    }
  }
  // Glue together the steps arrays.
  //   newSteps[0..leftLen-1] = left.steps (verbatim)
  //   newSteps[leftLen..leftLen+rightLen-1] = right.steps with step-refs
  //     shifted by leftLen
  //   newSteps[last] = the final op
  const leftLen = left.steps.length;
  const rightShifted: MathSolveStep[] = right.steps.map((s) => ({
    operator: s.operator,
    left:
      s.left.source === "step"
        ? { source: "step", index: s.left.index + leftLen }
        : s.left,
    right:
      s.right.source === "step"
        ? { source: "step", index: s.right.index + leftLen }
        : s.right,
  }));
  const newSteps: MathSolveStep[] = [...left.steps, ...rightShifted];
  const finalStep: MathSolveStep = {
    operator: op,
    left:
      left.kind === "pool"
        ? { source: "pool", index: left.poolIndex }
        : { source: "step", index: leftLen - 1 },
    right:
      right.kind === "pool"
        ? { source: "pool", index: right.poolIndex }
        : { source: "step", index: leftLen + rightShifted.length - 1 },
  };
  newSteps.push(finalStep);
  return {
    kind: "derived",
    id: `d${idCounter.current++}`,
    derivedSlot,
    value: v,
    steps: newSteps,
    freshUntil: Date.now() + 800,
  };
}

function Round({
  state,
  privateState,
  lastSolveResult,
  send,
  hiveHexes,
  addHiveHexes,
}: {
  state: MathPublicGameState;
  privateState: MathPrivatePlayerState | null;
  lastSolveResult:
    | { targetId: string; ok: boolean; reason?: string; points?: number; allSix?: boolean; solveMs?: number; at: number }
    | null;
  send: (m: MathClientMessage) => void;
  hiveHexes: number;
  addHiveHexes: (n: number) => void;
}) {
  const puzzle = state.puzzle;
  const target = privateState?.currentTarget ?? null;

  // When we fire solveTarget, record how many pool digits the submitted
  // solution used. On the server's ok response, those digits get deposited
  // into the hive — the "bees built N hexes worth of work." Cleared on
  // server response (ok or fail) so we never double-count.
  const pendingHexesRef = useRef(new Map<string, number>());

  // Workspace state — reset whenever the target changes.
  //
  // The selection model has three slots: two tile slots (tile1 = "left
  // operand", tile2 = "right operand") and one op slot. They can be filled
  // in any order — infix [tile, op, tile], RPN [tile, tile, op], and
  // prefix [op, tile, tile] all work. The combine fires the instant all
  // three slots are filled. tile1 (the first tile tapped) is always the
  // left operand of the resulting expression — important for `−` and `÷`
  // which aren't commutative.
  const idCounterRef = useRef({ current: 1 });
  const [tiles, setTiles] = useState<Tile[]>(() =>
    puzzle ? makePoolTiles(puzzle.digits) : [],
  );
  const [sel, setSel] = useState<{
    tile1: string | null;
    tile2: string | null;
    op: MathOperator | null;
  }>({ tile1: null, tile2: null, op: null });
  const [errorFlash, setErrorFlash] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [muted, setMuted] = useState(() => sounds.isMuted());

  // Reset workspace on new target.
  const targetIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!puzzle || !target) return;
    if (targetIdRef.current === target.id) return;
    targetIdRef.current = target.id;
    setTiles(makePoolTiles(puzzle.digits));
    setSel({ tile1: null, tile2: null, op: null });
    setErrorFlash(null);
  }, [target?.id, puzzle?.digits.join(",")]);

  // Toast feedback from solve/skip results. Also drives the hive: any
  // pending pool-digit count we recorded when sending the solveTarget
  // gets deposited into the hive once the server says "ok" (or discarded
  // on a fail/wrong_target).
  useEffect(() => {
    if (!lastSolveResult) return;
    const pending = pendingHexesRef.current.get(lastSolveResult.targetId);
    if (pending !== undefined) {
      pendingHexesRef.current.delete(lastSolveResult.targetId);
      if (lastSolveResult.ok && pending > 0) addHiveHexes(pending);
    }
    if (lastSolveResult.ok) {
      if (lastSolveResult.allSix) sounds.pangram();
      else sounds.good();
      const tag = `+${lastSolveResult.points}${lastSolveResult.allSix ? " ALL SIX" : ""}`;
      setFeedback({ msg: tag, ok: true });
    } else {
      sounds.bad();
      setFeedback({ msg: reasonText(lastSolveResult.reason), ok: false });
    }
    const t = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(t);
  }, [lastSolveResult]);

  // Points-clock: tick every 100ms so the displayed points smoothly decay.
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 100);
    return () => clearInterval(i);
  }, []);

  // Find the claimable tile (alive AND value === target). If multiple,
  // prefer the most recently created (which is the last in our tiles array
  // due to append-on-combine).
  const claimable = useMemo(() => {
    if (!target) return null;
    for (let i = tiles.length - 1; i >= 0; i--) {
      if (tiles[i].value === target.value) return tiles[i];
    }
    return null;
  }, [tiles, target?.value]);

  // Current decaying point value, based on target.startedAt.
  const currentPoints = useMemo(() => {
    if (!target) return 0;
    const elapsed = Math.max(0, nowTick - target.startedAt);
    const ratio = Math.max(0, Math.min(1, elapsed / target.timeBudgetMs));
    const decayed =
      target.basePoints - (target.basePoints - target.floorPoints) * ratio;
    return Math.max(target.floorPoints, Math.round(decayed));
  }, [target, nowTick]);

  if (!puzzle || !state.roundEndsAt) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Loading round...</span>
      </main>
    );
  }

  if (!target) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Waiting for a target...</span>
      </main>
    );
  }

  // Fires the combine once all three slots (tile1, tile2, op) are filled.
  // Called from both handleTileTap and handleOpTap — whichever input
  // completes the trio triggers the combine via this helper.
  const performCombine = (left: Tile, right: Tile, op: MathOperator) => {
    // Pick the lowest-free derived slot, treating any derived operands
    // being consumed by this combine as freed. This makes a fresh tile
    // tend to land back in the slot its left operand just vacated, giving
    // the chain a stable visual position.
    const inUse = new Set<number>();
    for (const t of tiles) {
      if (t.kind !== "derived") continue;
      if (t.id === left.id || t.id === right.id) continue;
      inUse.add(t.derivedSlot);
    }
    let derivedSlot = 0;
    while (inUse.has(derivedSlot)) derivedSlot++;

    const result = combineTiles(left, right, op, idCounterRef.current, derivedSlot);
    if ("error" in result) {
      setErrorFlash(result.error);
      setTimeout(() => setErrorFlash(null), 900);
      sounds.bad();
      setSel({ tile1: null, tile2: null, op: null });
      return;
    }
    setTiles((arr) => [
      ...arr.filter((t) => t.id !== left.id && t.id !== right.id),
      result,
    ]);
    setSel({ tile1: null, tile2: null, op: null });
    sounds.tick();
    if (target && result.value === target.value) {
      // Capture the pool-digit count for the hive metaphor before sending.
      // The server confirms (or rejects) async; the hive update fires when
      // lastSolveResult arrives.
      const mask = finalStepsMask(result.steps);
      pendingHexesRef.current.set(target.id, popcount(mask));
      send({ type: "solveTarget", targetId: target.id, steps: result.steps });
    }
  };

  const handleTileTap = (tile: Tile) => {
    // Deselect cases: tapping a currently-selected tile removes it from
    // the selection. If tile1 is deselected and tile2 is set, tile2
    // shifts down to fill tile1's slot (so the invariant "tile1 fills
    // before tile2" holds).
    if (sel.tile1 === tile.id) {
      setSel((s) => ({ tile1: s.tile2, tile2: null, op: s.op }));
      return;
    }
    if (sel.tile2 === tile.id) {
      setSel((s) => ({ ...s, tile2: null }));
      return;
    }
    // New selection. If tile1 is empty, fill tile1.
    if (!sel.tile1) {
      setSel((s) => ({ ...s, tile1: tile.id }));
      return;
    }
    // tile1 is already set; this tap fills (or replaces) tile2.
    // If op is also set, completing the trio fires the combine now.
    const leftTile = tiles.find((t) => t.id === sel.tile1);
    if (!leftTile) {
      setSel({ tile1: tile.id, tile2: null, op: sel.op });
      return;
    }
    if (sel.op) {
      performCombine(leftTile, tile, sel.op);
    } else {
      setSel((s) => ({ ...s, tile2: tile.id }));
    }
  };

  const handleOpTap = (op: MathOperator) => {
    // If both tile slots are already filled (RPN order: num, num, op),
    // tapping the op completes the trio and combines now.
    if (sel.tile1 && sel.tile2) {
      const t1 = tiles.find((t) => t.id === sel.tile1);
      const t2 = tiles.find((t) => t.id === sel.tile2);
      if (t1 && t2) {
        performCombine(t1, t2, op);
        return;
      }
    }
    // Otherwise just record the op — waiting for the missing tile(s).
    setSel((s) => ({ ...s, op }));
  };

  const handleReset = () => {
    if (!puzzle) return;
    setTiles(makePoolTiles(puzzle.digits));
    setSel({ tile1: null, tile2: null, op: null });
  };

  const handleSkip = () => {
    send({ type: "skipTarget", targetId: target.id });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sounds.setMuted(next);
  };

  const tile1 = sel.tile1 ? tiles.find((t) => t.id === sel.tile1) ?? null : null;
  const tile2 = sel.tile2 ? tiles.find((t) => t.id === sel.tile2) ?? null : null;
  const selectedIds = [sel.tile1, sel.tile2].filter((x): x is string => !!x);
  const allSixIfClaimed =
    claimable && claimable.kind === "derived"
      ? coversAllPositions(claimable.steps, puzzle.digits.length)
      : false;

  // Operator set: prefer the player's per-player allowed operators
  // from private state (set per-player by the server based on
  // difficulty handicap). Fall back to the public puzzle's ops if
  // private state hasn't arrived yet on first paint.
  const ops = privateState?.allowedOperators ?? puzzle.operators;

  const poolTiles = tiles.filter((t): t is PoolTile => t.kind === "pool");
  const derivedTiles = tiles.filter(
    (t): t is DerivedTile => t.kind === "derived",
  );

  // Layout: target/hint at top, derived workspace in the middle (grows to
  // fill remaining height), pool + operators + actions docked at the
  // bottom in the thumb zone. The derived area is its OWN space — the
  // 6 pool slots stay fixed and visibly empty as their digits get consumed,
  // so the player can always see which originals they have left.
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "56px 12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "stretch",
      }}
    >
      <style>{`
        @keyframes mh-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes mh-pop-in {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* TOP — header, target banner, feedback ribbon */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>R{state.currentRound}/{state.config.totalRounds}</span>
        <Timer endsAt={state.roundEndsAt} size={28} />
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={toggleMute} style={{ background: "transparent", color: "var(--muted)", padding: "4px 8px", fontSize: 13 }}>
            sound: {muted ? "off" : "on"}
          </button>
          <span style={{ fontSize: 14 }}>
            <strong>{privateState?.scoreThisRound ?? 0}</strong> pts
          </span>
        </span>
      </header>

      <TargetBanner
        target={target}
        currentPoints={currentPoints}
        canClaim={!!claimable}
        allSix={allSixIfClaimed}
      />

      <div
        style={{
          minHeight: 28,
          fontSize: 18,
          fontWeight: 700,
          textAlign: "center",
          color: feedback ? (feedback.ok ? GOOD : BAD) : errorFlash ? BAD : "var(--muted)",
        }}
      >
        {feedback?.msg ?? errorFlash ?? renderHint(tile1, tile2, sel.op)}
      </div>

      {/* MIDDLE — flex spacer so the hex grid sits at the bottom */}
      <div style={{ flex: 1, minHeight: 12 }} />

      {/* BOTTOM — 9-hex honeycomb (3 derived + 6 pool) + operators +
          actions, all in the thumb zone. Derived tiles appear in the
          row directly above the pool, tessellated as one continuous
          honeycomb. Consumed slots (pool or derived) show as visible
          dashed empty hexes. */}
      <HexGrid
        poolTiles={poolTiles}
        derivedTiles={derivedTiles}
        selectedIds={selectedIds}
        target={target.value}
        onTap={handleTileTap}
      />

      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        {ops.map((op) => (
          <OperatorButton
            key={op}
            op={op}
            active={sel.op === op}
            disabled={false}
            onClick={() => handleOpTap(op)}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={handleReset}
          style={{ flex: 1, fontSize: 16, padding: "14px 0", background: "var(--bg-elev)", color: "var(--fg)" }}
        >
          Reset
        </button>
        <button
          onClick={handleSkip}
          style={{ flex: 1, fontSize: 16, padding: "14px 0", background: "var(--bg-elev)", color: BAD }}
        >
          Skip −1
        </button>
      </div>

      {/* Bees building the hive. Replaces the in-round solved-chip list —
          mid-play there's no real need to review past targets, and the
          subtle growing honeycomb is more rewarding visual feedback. The
          full chip history is still shown on the ROUND_RESULTS screen. */}
      <BuiltHive hexCount={hiveHexes} />
    </main>
  );
}

function TargetBanner({
  target,
  currentPoints,
  canClaim,
  allSix,
}: {
  target: { value: number; minOps: number };
  currentPoints: number;
  canClaim: boolean;
  allSix: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: canClaim ? "rgba(127, 217, 127, 0.15)" : "var(--bg-elev)",
        borderRadius: 12,
        border: canClaim ? `2px solid ${GOOD}` : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        transition: "background 0.2s",
      }}
    >
      <div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Target</div>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: canClaim ? GOOD : "var(--fg)" }}>
          {target.value}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {target.minOps}-op min · {currentPoints}{allSix ? " +5" : ""} pts
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", opacity: 0.7 }}>
          Combine tiles to make it
        </div>
      </div>
    </div>
  );
}

// Merged hex grid — one honeycomb showing both pool and derived tiles
// tessellated as a single contiguous cluster. Layout (point-top hexes):
//
//        ⬡   ⬡   ⬡        ← row -1: 3 derived slots
//      ⬡   ⬡   ⬡          ← row  0: pool top
//        ⬡   ⬡   ⬡        ← row  1: pool bottom
//
// Derived row x-offsets match pool bottom (both rows are "odd" in the
// tessellation), so the whole structure forms a proper honeycomb.
// Consumed slots — whether pool or derived — render as visible dashed
// empty hexes, keeping the layout stable across the round.
function HexGrid({
  poolTiles,
  derivedTiles,
  selectedIds,
  target,
  onTap,
}: {
  poolTiles: PoolTile[];
  derivedTiles: DerivedTile[];
  selectedIds: string[];
  target: number;
  onTap: (t: Tile) => void;
}) {
  const HEX_R = 50;
  const HW = HEX_R * Math.sqrt(3);
  const ROW_DY = 1.5 * HEX_R;

  // Three derived slots in row -1 (y = -0.5R), offset by HW like pool
  // bottom row so they tessellate above pool top.
  const derivedPositions: { x: number; y: number }[] = [
    { x: HW * 1.0, y: -0.5 * HEX_R },
    { x: HW * 2.0, y: -0.5 * HEX_R },
    { x: HW * 3.0, y: -0.5 * HEX_R },
  ];
  // Six pool slots — 3 top (row 0) + 3 bottom-offset (row 1).
  const poolPositions: { x: number; y: number }[] = [
    { x: HW * 0.5, y: HEX_R },
    { x: HW * 1.5, y: HEX_R },
    { x: HW * 2.5, y: HEX_R },
    { x: HW * 1.0, y: HEX_R + ROW_DY },
    { x: HW * 2.0, y: HEX_R + ROW_DY },
    { x: HW * 3.0, y: HEX_R + ROW_DY },
  ];

  // viewBox encompasses all three rows.
  //   x: leftmost vertex of pool-top-left hex is at HW*0.5 - HW/2 = 0
  //      rightmost vertex of row -1/1 rightmost hex is at HW*3 + HW/2 = 3.5HW
  //   y: top vertex of row -1 hex is at -0.5R - R = -1.5R
  //      bottom vertex of pool-bottom hex is at HEX_R + ROW_DY + R = 3.5R
  const vbWidth = HW * 3.5;
  const vbY = -1.5 * HEX_R;
  const vbHeight = 5 * HEX_R;

  const poolBySlot = new Map<number, PoolTile>();
  for (const t of poolTiles) poolBySlot.set(t.poolSlot, t);
  const derivedBySlot = new Map<number, DerivedTile>();
  for (const t of derivedTiles) derivedBySlot.set(t.derivedSlot, t);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg
        viewBox={`0 ${vbY} ${vbWidth} ${vbHeight}`}
        width="100%"
        style={{ maxWidth: 380, display: "block" }}
      >
        {derivedPositions.map((pos, slot) => {
          const tile = derivedBySlot.get(slot) ?? null;
          return (
            <HexCell
              key={`d${slot}`}
              tile={tile}
              x={pos.x}
              y={pos.y}
              hexR={HEX_R}
              isSelected={!!tile && selectedIds.includes(tile.id)}
              isMatch={!!tile && tile.value === target}
              onTap={onTap}
            />
          );
        })}
        {poolPositions.map((pos, slot) => {
          const tile = poolBySlot.get(slot) ?? null;
          return (
            <HexCell
              key={`p${slot}`}
              tile={tile}
              x={pos.x}
              y={pos.y}
              hexR={HEX_R}
              isSelected={!!tile && selectedIds.includes(tile.id)}
              isMatch={!!tile && tile.value === target}
              onTap={onTap}
            />
          );
        })}
      </svg>
    </div>
  );
}

// Single hex cell — used by both the pool grid (laid out in fixed slots)
// and the derived row (flex-laid in their own per-tile SVGs).
function HexCell({
  tile,
  x,
  y,
  hexR,
  isSelected,
  isMatch,
  onTap,
}: {
  tile: Tile | null;
  x: number;
  y: number;
  hexR: number;
  isSelected: boolean;
  isMatch: boolean;
  onTap: (t: Tile) => void;
}) {
  const isFresh = !!tile && tile.kind === "derived" && tile.freshUntil > Date.now();
  const isDerived = !!tile && tile.kind === "derived";
  const isPool = !!tile && tile.kind === "pool";
  const isEmpty = !tile;

  const fill = isEmpty
    ? "transparent"
    : isMatch
      ? "rgba(127, 217, 127, 0.25)"
      : isDerived
        ? "rgba(106, 166, 255, 0.18)"
        : POOL_FILL;
  const stroke = isSelected
    ? ACCENT
    : isMatch
      ? GOOD
      : isEmpty
        ? "var(--muted)"
        : "var(--border)";
  const strokeWidth = isSelected ? 4 : 2;
  const strokeDash = isEmpty ? "5 5" : undefined;
  // Dark text reads better on the warm yellow pool tiles; derived/matching
  // tiles stay light-on-dark.
  const textFill = isPool ? POOL_TEXT : "var(--fg)";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{
        cursor: tile ? "pointer" : "default",
        transformOrigin: "center",
        animation: isFresh ? "mh-pop-in 0.3s ease-out" : undefined,
      }}
      onClick={() => tile && onTap(tile)}
    >
      <polygon
        points={hexPoints(hexR)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        opacity={isEmpty ? 0.35 : 1}
        style={{ transition: "fill 0.18s, stroke 0.18s" }}
      />
      {tile && (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={tile.value > 99 ? hexR * 0.75 : hexR * 0.95}
          fontWeight={800}
          fill={textFill}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {tile.value}
        </text>
      )}
    </g>
  );
}

// Point-top hex vertices: top, upper-right, lower-right, bottom, lower-left,
// upper-left. Returns an SVG points attribute string.
function hexPoints(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function OperatorButton({
  op,
  active,
  disabled,
  onClick,
}: {
  op: MathOperator;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 60,
        height: 60,
        fontSize: 28,
        fontWeight: 800,
        borderRadius: 12,
        background: active ? ACCENT : "var(--bg-elev)",
        color: active ? ACCENT_FG : "var(--fg)",
        border: "2px solid var(--border)",
        opacity: disabled ? 0.4 : 1,
        padding: 0,
      }}
    >
      {OP_GLYPH[op]}
    </button>
  );
}

function SolvedStrip({
  solved,
  skipped,
}: {
  solved: MathSolvedRecord[];
  skipped: { targetValue: number }[];
}) {
  if (solved.length === 0 && skipped.length === 0) {
    return (
      <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 13, textAlign: "center" }}>
        Solved targets show here.
      </p>
    );
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 4 }}>
        Solved {solved.length} · Skipped {skipped.length}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {[...solved].reverse().map((r) => (
          <span
            key={r.targetId}
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: r.allSix ? ACCENT : "var(--bg-elev)",
              color: r.allSix ? ACCENT_FG : "var(--fg)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {r.targetValue} <span style={{ opacity: 0.7, marginLeft: 4 }}>+{r.points}</span>
            {r.allSix && <span style={{ marginLeft: 3 }}>★</span>}
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
          <button onClick={() => send({ type: "nextRound" })} style={{ fontSize: 16, padding: "10px 16px", background: ACCENT, color: ACCENT_FG }}>
            {isFinal ? "Show final →" : "Next round →"}
          </button>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Waiting for host…</span>
        )}
      </header>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        You scored <strong style={{ color: "var(--fg)" }}>{privateState?.scoreThisRound ?? 0}</strong> this round.
      </p>
      <SolvedStrip
        solved={privateState?.solved ?? []}
        skipped={privateState?.skipped ?? []}
      />
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
                  background: isMe ? ACCENT : "var(--bg-elev)",
                  color: isMe ? ACCENT_FG : "var(--fg)",
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
          <button onClick={() => send({ type: "playAgain" })} style={{ fontSize: 20, padding: 16, width: "100%", marginTop: 16, background: ACCENT, color: ACCENT_FG }}>
            Play again
          </button>
        ) : (
          <p style={{ color: "var(--muted)", marginTop: 16 }}>Waiting for host...</p>
        )}
      </main>
    </>
  );
}

// Renders the "what have I staged so far" hint above the workspace. Covers
// every partial state of the two-tile / one-op selection model.
function renderHint(tile1: Tile | null, tile2: Tile | null, op: MathOperator | null): string {
  if (tile1 && tile2 && op) {
    // Shouldn't normally render — combine fires when all three are set.
    return `${tile1.value} ${OP_GLYPH[op]} ${tile2.value}`;
  }
  if (tile1 && op) return `${tile1.value} ${OP_GLYPH[op]} ?`;
  if (tile1 && tile2) return `${tile1.value} ? ${tile2.value}`;
  if (op && tile1) return `${tile1.value} ${OP_GLYPH[op]} ?`;
  if (op) return `? ${OP_GLYPH[op]} ?`;
  if (tile1) return `${tile1.value} …`;
  return "Tap tiles and an operator (any order)";
}

// Walk the steps tree and return the bitmask of pool positions consumed
// by the FINAL step's result tile. Each step's mask is the union of its
// operand masks (pool refs contribute a single bit; step refs contribute
// the prior step's mask).
function finalStepsMask(steps: MathSolveStep[]): number {
  if (steps.length === 0) return 0;
  const stepMasks: number[] = [];
  for (const s of steps) {
    const lm =
      s.left.source === "pool"
        ? 1 << s.left.index
        : stepMasks[s.left.index] ?? 0;
    const rm =
      s.right.source === "pool"
        ? 1 << s.right.index
        : stepMasks[s.right.index] ?? 0;
    stepMasks.push(lm | rm);
  }
  return stepMasks[stepMasks.length - 1] ?? 0;
}

function popcount(n: number): number {
  let c = 0;
  let m = n >>> 0;
  while (m) {
    c += m & 1;
    m >>>= 1;
  }
  return c;
}

function coversAllPositions(steps: MathSolveStep[], poolSize: number): boolean {
  if (steps.length === 0) return false;
  return finalStepsMask(steps) === (1 << poolSize) - 1;
}

function reasonText(r: string | undefined): string {
  switch (r) {
    case "wrong_target":
      return "Stale target";
    case "invalid_steps":
      return "Invalid steps";
    case "value_mismatch":
      return "Doesn't match target";
    case "div_by_zero":
      return "Divide by zero";
    case "div_non_integer":
      return "Division not whole";
    case "disallowed_operator":
      return "Operator not allowed";
    case "not_in_round":
      return "Round not active";
    default:
      return "Invalid";
  }
}
