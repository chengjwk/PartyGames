// Pollinart player route — Pictionary-meets-Telephone gameplay on the
// phone. Routes through these phases (driven server-side):
//
//   LOBBY            → name entry + waiting list + host start
//   ROUND_STARTING   → 3-second countdown
//   WORD_PICK        → pick one of 3 starting words
//   DRAW_PHASE       → DrawingCanvas with the prompted word
//   GUESS_PHASE      → DrawingReplay of the assigned drawing + guess input
//   REVEAL           → watch each chain animate in
//   ROUND_RESULTS    → per-player scores; host advances
//   FINAL_RESULTS    → final scoreboard + Play Again
//
// Player private state carries a per-step `task` from the server so we
// always know what UI to show — including a "you already submitted,
// waiting on the others" state.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";
import { getClientId } from "../lib/clientId";
import { randomName } from "../lib/randomName";
import { AVATARS, randomAvatar } from "../lib/avatars";
import { requestFullscreenIfMobile } from "../lib/fullscreen";
import Avatar from "../components/Avatar";
import Timer from "../components/Timer";
import PausedOverlay from "../components/PausedOverlay";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import ThemeToggle from "../components/ThemeToggle";
import GameMenu from "../components/GameMenu";
import DrawingCanvas from "../components/DrawingCanvas";
import DrawingReplay from "../components/DrawingReplay";
import type { Player, PublicGameState } from "../shared/types";
import type {
  ChainRevealed,
  Drawing,
  PollinartClientMessage,
  PollinartComplexity,
  PollinartPrivateState,
  PollinartPublicGameState,
  PollinartServerMessage,
} from "../shared/pollinart-types";

const NAME_KEY = "wordhive.name";
const AVATAR_KEY = "wordhive.avatar";

const ACCENT = "#f0b070";
const ACCENT_FG = "#1a1a1f";

// Custom hook — mirror useRoomSocket but for the pollinart party + Pollinart
// message types.
function usePollinartRoomSocket(roomCode: string, role: "host" | "player") {
  const [state, setState] = useState<PollinartPublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<PollinartPrivateState | null>(null);
  const [switchAt, setSwitchAt] = useState<number | null>(null);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party: "pollinart",
      query: { role },
    });
    const onMsg = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as PollinartServerMessage;
      switch (msg.type) {
        case "state":
          setState(msg.state);
          break;
        case "private":
          setPrivateState(msg.private);
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

  const send = (msg: PollinartClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  };

  return { state, privateState, switchAt, send, connectionEpoch };
}

export default function PollinartPlay() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const { state, privateState, send, switchAt, connectionEpoch } =
    usePollinartRoomSocket(roomCode, "player");
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

  // Reconnect handler: re-send join on every socket re-open so the
  // server reassociates the new connection with our clientId.
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
        <ThemeToggle />
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
        <ThemeToggle />
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
    case "WORD_PICK":
    case "DRAW_PHASE":
    case "GUESS_PHASE":
      view = (
        <ActiveStep state={state} privateState={privateState} send={send} />
      );
      break;
    case "REVEAL":
      view = <Reveal state={state} isHost={isHost} send={send} />;
      break;
    case "ROUND_RESULTS":
      view = (
        <RoundResults
          state={state}
          isHost={isHost}
          send={send}
          clientId={clientId}
        />
      );
      break;
    case "FINAL_RESULTS":
      view = (
        <FinalResults
          state={state}
          isHost={isHost}
          send={send}
          clientId={clientId}
        />
      );
      break;
  }

  // GameMenu expects the old-shape PublicGameState. Pollinart's state shape
  // is similar enough (phase + paused) that the menu's branches still work;
  // we cast through unknown because the phase string set is wider here.
  const stateForMenu = state as unknown as PublicGameState;
  const disconnected = state.players.filter((p) => !p.connected);
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <ThemeToggle />
      <GameMenu
        state={stateForMenu}
        send={send as unknown as (m: unknown) => void as never}
        isHost={isHost}
      />
      {view}
      {state.paused && (
        <PausedOverlay
          roomCode={roomCode}
          disconnected={disconnected}
          showQR={false}
          game="draw"
          onResume={() => send({ type: "togglePause" })}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Phase views
// ──────────────────────────────────────────────────────────────────

function Lobby({
  state,
  roomCode,
  isHost,
  clientId,
  send,
}: {
  state: PollinartPublicGameState;
  roomCode: string;
  isHost: boolean;
  clientId: string;
  send: (m: PollinartClientMessage) => void;
}) {
  const cfg = state.config;
  const playerCount = state.players.filter((p) => p.connected).length;
  const canStart = playerCount >= 3;
  const setCfg = (patch: Partial<typeof cfg>) =>
    send({ type: "configure", config: patch });
  return (
    <main style={{ padding: "60px 20px 24px" }}>
      <h1 style={{ margin: 0, color: ACCENT }}>Pollinart</h1>
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
              <Stepper
                value={cfg.totalRounds}
                min={1}
                max={5}
                onChange={(v) => setCfg({ totalRounds: v })}
              />
            </ConfigRow>
            <ConfigRow label="Draw time (sec)">
              <Stepper
                value={cfg.drawSeconds}
                min={20}
                max={120}
                step={5}
                onChange={(v) => setCfg({ drawSeconds: v })}
              />
            </ConfigRow>
            <ConfigRow label="Guess time (sec)">
              <Stepper
                value={cfg.guessSeconds}
                min={5}
                max={45}
                step={5}
                onChange={(v) => setCfg({ guessSeconds: v })}
              />
            </ConfigRow>
            <ConfigRow label="Word difficulty">
              <ComplexityPicker
                value={cfg.complexity}
                onChange={(c) => setCfg({ complexity: c })}
              />
            </ConfigRow>
          </section>
          <button
            onClick={() => send({ type: "startGame" })}
            disabled={!canStart}
            style={{
              fontSize: 22,
              padding: 16,
              marginTop: 16,
              width: "100%",
              background: ACCENT,
              color: ACCENT_FG,
            }}
          >
            {canStart ? "Start Game" : `Need ${3 - playerCount} more player${3 - playerCount === 1 ? "" : "s"}`}
          </button>
        </>
      ) : (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>
          Waiting for{" "}
          {state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host"} to
          start...
        </p>
      )}
    </main>
  );
}

function ComplexityPicker({
  value,
  onChange,
}: {
  value: PollinartComplexity;
  onChange: (c: PollinartComplexity) => void;
}) {
  const opts: Array<{ id: PollinartComplexity; label: string }> = [
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Hard" },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map((o) => (
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

function RoundStarting({ state }: { state: PollinartPublicGameState }) {
  const [secs, setSecs] = useState(() =>
    state.roundStartsAt
      ? Math.max(0, Math.ceil((state.roundStartsAt - Date.now()) / 1000))
      : 3,
  );
  useEffect(() => {
    if (!state.roundStartsAt) return;
    const tick = () =>
      setSecs(Math.max(0, Math.ceil((state.roundStartsAt! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [state.roundStartsAt]);
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "var(--muted)", fontSize: 18 }}>
          Round {state.currentRound}
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, color: ACCENT }}>{secs}</div>
        <div style={{ color: "var(--muted)" }}>Get ready to draw!</div>
      </div>
    </main>
  );
}

// Driver for the three "do something now" phases. Uses privateState.task
// to figure out what the player should be doing.
function ActiveStep({
  state,
  privateState,
  send,
}: {
  state: PollinartPublicGameState;
  privateState: PollinartPrivateState | null;
  send: (m: PollinartClientMessage) => void;
}) {
  const task = privateState?.task;
  const phaseEndsAt = state.phaseEndsAt;
  const submittedCount = state.stepSubmittedCount;
  const expectedCount = state.stepExpectedCount;

  if (!task || task.kind === "idle") {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Loading…</span>
      </main>
    );
  }

  // The phase header is shared across all step views.
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Round {state.currentRound} ·{" "}
          {state.phase === "WORD_PICK"
            ? "Pick your word"
            : state.phase === "DRAW_PHASE"
              ? `Step ${(state.stepIndex ?? 0) + 1}/${
                  state.chains?.[0]?.chainLength ?? "?"
                } — drawing`
              : `Step ${(state.stepIndex ?? 0) + 1}/${
                  state.chains?.[0]?.chainLength ?? "?"
                } — guessing`}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {submittedCount}/{expectedCount} submitted
        </div>
      </div>
      {phaseEndsAt && <Timer endsAt={phaseEndsAt} />}
    </div>
  );

  if (task.kind === "pickWord") {
    return (
      <main style={{ padding: "60px 0 24px", display: "flex", flexDirection: "column" }}>
        {header}
        <div style={{ padding: "0 16px" }}>
          <h2 style={{ marginTop: 0 }}>Pick a word to draw</h2>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Whatever you pick is what you'll draw for your chain.
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {task.choices.map((w) => (
              <button
                key={w}
                onClick={() => send({ type: "pickWord", word: w })}
                style={{
                  fontSize: 22,
                  padding: 16,
                  background: ACCENT,
                  color: ACCENT_FG,
                  borderRadius: 12,
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (task.kind === "wait") {
    return (
      <main style={{ padding: "60px 0 24px", display: "flex", flexDirection: "column" }}>
        {header}
        <div
          style={{
            padding: "40px 16px",
            display: "grid",
            placeItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 64 }}>⏳</div>
          <div style={{ color: "var(--fg)", fontSize: 20, textAlign: "center" }}>
            Submitted! Waiting on the others.
          </div>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            {submittedCount}/{expectedCount} done
          </div>
        </div>
      </main>
    );
  }

  if (task.kind === "draw") {
    return (
      <DrawView
        header={header}
        task={task}
        players={state.players}
        onSubmit={(drawing) =>
          send({
            type: "submitDrawing",
            chainId: task.chainId,
            stepIndex: task.stepIndex,
            drawing,
          })
        }
      />
    );
  }

  if (task.kind === "guess") {
    return (
      <GuessView
        header={header}
        task={task}
        players={state.players}
        onSubmit={(guess) =>
          send({
            type: "submitGuess",
            chainId: task.chainId,
            stepIndex: task.stepIndex,
            guess,
          })
        }
      />
    );
  }
  return null;
}

function DrawView({
  header,
  task,
  onSubmit,
  players,
}: {
  header: React.ReactNode;
  task: Extract<PollinartPrivateState["task"], { kind: "draw" }>;
  onSubmit: (d: Drawing) => void;
  players: Player[];
}) {
  const nextName =
    task.nextPlayerId &&
    (players.find((p) => p.id === task.nextPlayerId)?.name ?? null);
  return (
    <main
      style={{
        padding: "56px 0 16px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      {header}
      <div
        style={{
          padding: "0 8px 8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          flex: 1,
        }}
      >
        <DrawingCanvas
          onSubmit={onSubmit}
          promptWord={task.promptedWord}
          passHint={nextName ? `Passing to ${nextName}` : undefined}
          autoSubmitAt={task.phaseEndsAt}
        />
      </div>
    </main>
  );
}

function GuessView({
  header,
  task,
  onSubmit,
  players,
}: {
  header: React.ReactNode;
  task: Extract<PollinartPrivateState["task"], { kind: "guess" }>;
  onSubmit: (g: string) => void;
  players: Player[];
}) {
  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Visual viewport height — falls back to window.innerHeight on
  // browsers without VisualViewport. On mobile this shrinks when
  // the keyboard opens; we use it to keep the input bar visible.
  const [vh, setVh] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  // Sticky bottom inset — pushes the input above the keyboard.
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setVh(vv.height);
      // The keyboard occludes (window.innerHeight - vv.height) pixels
      // at the bottom of the page. visualViewport.offsetTop accounts
      // for cases where the page itself has scrolled.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    onSubmit(guess);
  };
  useEffect(() => {
    setGuess("");
    setSubmitting(false);
  }, [task.chainId, task.stepIndex]);

  // Auto-submit at deadline so a player typing right up to the buzzer
  // still gets their guess in — beats the server's empty auto-fill.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const guessRef = useRef(guess);
  guessRef.current = guess;
  useEffect(() => {
    if (!task.phaseEndsAt) return;
    const delay = Math.max(0, task.phaseEndsAt - 600 - Date.now());
    const id = setTimeout(() => {
      // Only auto-fire if we haven't already submitted.
      if (!submitRef.current) return;
      // Re-read current guess from ref so a late-typed guess gets sent.
      submitRef.current();
    }, delay);
    return () => clearTimeout(id);
  }, [task.phaseEndsAt, task.chainId, task.stepIndex]);

  // Canvas sizing accounts for keyboard inset and ~190px below the
  // canvas for the input bar + header + pass-to text.
  const reservedBelow = 200 + keyboardInset;
  const size = Math.max(
    160,
    Math.min(window.innerWidth - 24, vh - reservedBelow, 520),
  );
  const nextName =
    task.nextPlayerId &&
    (players.find((p) => p.id === task.nextPlayerId)?.name ?? null);

  return (
    <main
      style={{
        padding: "56px 0 0",
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      {header}
      <div
        style={{
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          // Leave room for the sticky input bar at the bottom.
          paddingBottom: 90 + keyboardInset,
        }}
      >
        <DrawingReplay drawing={task.drawing} size={size} />
        {nextName ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Passing to {nextName}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Last guess!</div>
        )}
      </div>
      {/* Sticky bottom input bar — rides above the on-screen
          keyboard via the visualViewport-derived inset. */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: keyboardInset,
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          padding: "10px 12px",
          display: "flex",
          gap: 8,
          zIndex: 30,
        }}
      >
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="What is it?"
          maxLength={60}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={submitting}
          style={{ flex: 1, fontSize: 20, padding: 12 }}
        />
        <button
          onClick={submit}
          disabled={submitting || !guess.trim()}
          style={{ fontSize: 18, padding: "12px 16px" }}
        >
          Send
        </button>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────
// Reveal + results
// ──────────────────────────────────────────────────────────────────

function Reveal({
  state,
  isHost,
  send,
}: {
  state: PollinartPublicGameState;
  isHost: boolean;
  send: (m: PollinartClientMessage) => void;
}) {
  const summary = state.roundSummary;
  const chainIndex = state.revealChainIndex ?? 0;
  const stepIndex = state.revealStepIndex ?? -1;
  if (!summary) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Preparing reveal…</span>
      </main>
    );
  }
  const chain = summary.chains[chainIndex];
  if (!chain) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Reveal complete.</span>
      </main>
    );
  }
  const startedByPlayer = state.players.find((p) => p.id === chain.startedBy);

  return (
    <main
      style={{
        padding: "60px 16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: "100dvh",
      }}
    >
      <h2 style={{ margin: 0, color: ACCENT }}>
        Chain {chainIndex + 1} / {summary.chains.length}
      </h2>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>
        Started by {startedByPlayer?.name ?? "someone"}
      </div>
      <ChainPlayback chain={chain} upToStep={stepIndex} state={state} />
      {isHost && (
        <button
          onClick={() => send({ type: "advanceReveal" })}
          style={{ fontSize: 20, padding: 14, marginTop: 8 }}
        >
          {stepIndex < chain.chainLength - 1
            ? "Next →"
            : chainIndex < summary.chains.length - 1
              ? "Next chain →"
              : "End reveal →"}
        </button>
      )}
      {!isHost && (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>
          {state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host"} is
          tapping through the reveal.
        </p>
      )}
    </main>
  );
}

function ChainPlayback({
  chain,
  upToStep,
  state,
}: {
  chain: ChainRevealed;
  upToStep: number;
  state: PollinartPublicGameState;
}) {
  // Pair the chain's steps as (drawing, guess). Each pair is one
  // round of the telephone game. With our chainLength guaranteed
  // even, every drawing has a matching guess at the next index.
  const pairs: Array<{
    drawIndex: number;
    drawerName: string;
    drawing: ChainRevealed["steps"][number];
    guesserName: string;
    guess: ChainRevealed["steps"][number];
  }> = [];
  for (let i = 0; i + 1 < chain.chainLength; i += 2) {
    const draw = chain.steps.find((s) => s.index === i);
    const guess = chain.steps.find((s) => s.index === i + 1);
    if (!draw || !guess) continue;
    pairs.push({
      drawIndex: i,
      drawerName: state.players.find((p) => p.id === draw.playerId)?.name ?? "",
      drawing: draw,
      guesserName: state.players.find((p) => p.id === guess.playerId)?.name ?? "",
      guess,
    });
  }
  // Show only pairs whose guess step has been revealed.
  const revealedPairs = pairs.filter((p) => p.guess.index <= upToStep);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SeedCard
        startingWord={chain.startingWord}
        starterName={
          state.players.find((p) => p.id === chain.startedBy)?.name ?? ""
        }
      />
      {revealedPairs.map((pair) => (
        <ChainPairCard key={pair.drawIndex} pair={pair} compact />
      ))}
    </div>
  );
}

function SeedCard({
  startingWord,
  starterName,
}: {
  startingWord: string;
  starterName: string;
}) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "var(--bg-elev)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        {starterName} started with
      </div>
      <strong style={{ fontSize: 26, color: ACCENT }}>{startingWord}</strong>
    </div>
  );
}

// One (drawing, guess) pair card. Drawing on top, guess underneath,
// match badge to the right of the guess. `compact` shrinks the
// drawing for the phone column layout.
export function ChainPairCard({
  pair,
  compact,
}: {
  pair: {
    drawIndex: number;
    drawerName: string;
    drawing: ChainRevealed["steps"][number];
    guesserName: string;
    guess: ChainRevealed["steps"][number];
  };
  compact?: boolean;
}) {
  if (pair.drawing.kind !== "draw" || pair.guess.kind !== "guess") return null;
  const size = compact
    ? Math.min(window.innerWidth - 60, 320)
    : 360;
  const matched = pair.guess.isMatch;
  return (
    <div
      style={{
        padding: 12,
        background: "var(--bg-elev)",
        borderRadius: 12,
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        minWidth: size + 24,
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12, alignSelf: "stretch" }}>
        {pair.drawerName} drew
      </div>
      <DrawingReplay drawing={pair.drawing.drawing} size={size} />
      <div
        style={{
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 20,
          paddingTop: 4,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          {pair.guesserName} guessed
        </span>
        <strong style={{ color: "var(--fg)", flex: 1 }}>
          {pair.guess.guess ? (
            `"${pair.guess.guess}"`
          ) : (
            <em style={{ color: "var(--muted)" }}>(no guess)</em>
          )}
        </strong>
        <MatchBadge matched={matched} />
      </div>
    </div>
  );
}

export function MatchBadge({ matched }: { matched: boolean }) {
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 12,
        background: matched
          ? "rgba(127, 217, 127, 0.22)"
          : "rgba(255, 140, 140, 0.18)",
        color: matched ? "#2f7a32" : "#c0494c",
        whiteSpace: "nowrap",
      }}
    >
      {matched ? "✓ match" : "✗ no match"}
    </span>
  );
}

function RoundResults({
  state,
  isHost,
  send,
  clientId,
}: {
  state: PollinartPublicGameState;
  isHost: boolean;
  send: (m: PollinartClientMessage) => void;
  clientId: string;
}) {
  const sortedTotals = [...state.players]
    .map((p) => ({ p, score: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const summary = state.roundSummary;
  const more = state.currentRound < state.config.totalRounds;
  return (
    <main style={{ padding: "60px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, color: ACCENT }}>
        Round {state.currentRound} results
      </h2>
      <div style={{ display: "grid", gap: 8 }}>
        {sortedTotals.map(({ p, score }) => {
          const round = summary?.perPlayer[p.id] ?? 0;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "var(--bg-elev)",
                borderRadius: 8,
                border: p.id === clientId ? "1px solid var(--accent)" : "1px solid var(--border)",
              }}
            >
              <Avatar id={p.avatar} size={36} />
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ color: "var(--muted)" }}>+{round}</span>
              <strong style={{ minWidth: 50, textAlign: "right" }}>{score}</strong>
            </div>
          );
        })}
      </div>
      {isHost ? (
        <button
          onClick={() => send({ type: "nextRound" })}
          style={{ fontSize: 22, padding: 16, marginTop: 12 }}
        >
          {more ? "Next round →" : "See final results →"}
        </button>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          Waiting for{" "}
          {state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host"}…
        </p>
      )}
    </main>
  );
}

function FinalResults({
  state,
  isHost,
  send,
  clientId,
}: {
  state: PollinartPublicGameState;
  isHost: boolean;
  send: (m: PollinartClientMessage) => void;
  clientId: string;
}) {
  const sortedTotals = [...state.players]
    .map((p) => ({ p, score: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return (
    <main style={{ padding: "60px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, color: ACCENT }}>Final results</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {sortedTotals.map(({ p, score }, idx) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: idx === 0 ? "rgba(245, 180, 0, 0.18)" : "var(--bg-elev)",
              borderRadius: 8,
              border: p.id === clientId ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
          >
            <strong style={{ width: 22, textAlign: "center" }}>{idx + 1}</strong>
            <Avatar id={p.avatar} size={36} />
            <span style={{ flex: 1 }}>{p.name}</span>
            <strong style={{ minWidth: 50, textAlign: "right" }}>{score}</strong>
          </div>
        ))}
      </div>
      {isHost && (
        <button
          onClick={() => send({ type: "playAgain" })}
          style={{ fontSize: 22, padding: 16, marginTop: 12 }}
        >
          Play again
        </button>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────
// Shared bits — copied from MathPlay/Play patterns
// ──────────────────────────────────────────────────────────────────

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
      <h1 style={{ margin: 0, color: ACCENT }}>Pollinart</h1>
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
    <li
      style={{
        padding: "8px 12px",
        background: "var(--bg-elev)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: player.connected ? 1 : 0.4,
      }}
    >
      <Avatar id={player.avatar} size={36} />
      <span style={{ flex: 1 }}>
        {player.name}
        {isMe && (
          <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 13 }}>
            (you)
          </span>
        )}
        {isHostBadge && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              background: ACCENT,
              color: ACCENT_FG,
              fontWeight: 700,
            }}
          >
            HOST
          </span>
        )}
      </span>
    </li>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ flex: 1 }}>{label}</span>
      {children}
    </div>
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
  onChange: (n: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={{ padding: "4px 10px" }}
      >
        −
      </button>
      <span style={{ minWidth: 36, textAlign: "center" }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        style={{ padding: "4px 10px" }}
      >
        +
      </button>
    </div>
  );
}
