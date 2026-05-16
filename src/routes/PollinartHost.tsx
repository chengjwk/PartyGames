// Pollinart TV host display. Mirrors the player phases as a passive
// view (no drawing here — the action happens on phones). The TV shows:
//   - LOBBY: QR + player list + settings preview
//   - ROUND_STARTING: countdown
//   - WORD_PICK / DRAW_PHASE / GUESS_PHASE: "who's still working" status
//   - REVEAL: the same animated chain-by-chain walkthrough as the phones
//   - ROUND_RESULTS / FINAL_RESULTS: big scoreboard

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PartySocket from "partysocket";
import { QRCodeSVG } from "qrcode.react";
import { PARTY_HOST } from "../config";
import Avatar from "../components/Avatar";
import Timer from "../components/Timer";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import ThemeToggle from "../components/ThemeToggle";
import SoundUnlockPrompt from "../components/SoundUnlockPrompt";
import DrawingReplay from "../components/DrawingReplay";
import type {
  ChainRevealed,
  PollinartPublicGameState,
  PollinartServerMessage,
} from "../shared/pollinart-types";

const ACCENT = "#f0b070";

export default function PollinartHost() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const [searchParams] = useSearchParams();
  const wantsReset = searchParams.has("reset");
  const nav = useNavigate();
  const [state, setState] = useState<PollinartPublicGameState | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party: "pollinart",
      query: { role: "host" },
    });
    const onMsg = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as PollinartServerMessage;
      if (msg.type === "state") setState(msg.state);
      if (msg.type === "switchGames") {
        nav(`/host/${roomCode}?reset=1`, { replace: true });
      }
    };
    socket.addEventListener("message", onMsg);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.close();
    };
  }, [roomCode, nav]);

  // Coming back from another game via switchGames — bounce up to the
  // shared lobby picker. (Same pattern as MathHost.)
  useEffect(() => {
    if (wantsReset) nav(`/host/${roomCode}?reset=1`, { replace: true });
  }, [wantsReset, roomCode, nav]);

  if (!state) {
    return (
      <>
        <GardenBackground />
        <FullscreenButton />
        <ThemeToggle />
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
          <span style={{ color: "var(--muted)" }}>Connecting…</span>
        </main>
      </>
    );
  }

  let view: React.ReactNode = null;
  switch (state.phase) {
    case "LOBBY":
      view = <LobbyView state={state} roomCode={roomCode} />;
      break;
    case "ROUND_STARTING":
      view = <CountdownView state={state} />;
      break;
    case "WORD_PICK":
      view = <PhaseStatus state={state} title="Picking words" />;
      break;
    case "DRAW_PHASE":
      view = <PhaseStatus state={state} title="Drawing" />;
      break;
    case "GUESS_PHASE":
      view = <PhaseStatus state={state} title="Guessing" />;
      break;
    case "REVEAL":
      view = <RevealView state={state} />;
      break;
    case "ROUND_RESULTS":
      view = <ResultsView state={state} title={`Round ${state.currentRound} results`} />;
      break;
    case "FINAL_RESULTS":
      view = <ResultsView state={state} title="Final results" final />;
      break;
  }

  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <ThemeToggle />
      <SoundUnlockPrompt />
      {view}
    </>
  );
}

function LobbyView({
  state,
  roomCode,
}: {
  state: PollinartPublicGameState;
  roomCode: string;
}) {
  const playUrl = `${window.location.origin}/play/${roomCode}`;
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "24px 32px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 32,
        alignItems: "center",
      }}
    >
      <section style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 56, margin: 0, color: ACCENT }}>Pollinart</h1>
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
          Players{" "}
          <span style={{ color: "var(--muted)" }}>({state.players.length})</span>
        </h2>
        {state.players.length === 0 && (
          <p style={{ color: "var(--muted)" }}>Waiting for players to join…</p>
        )}
        {state.players.length > 0 && state.players.length < 3 && (
          <p style={{ color: "var(--muted)" }}>
            Need {3 - state.players.length} more — Pollinart works best with 3+
            players.
          </p>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {state.players.map((p) => (
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
              <span style={{ flex: 1 }}>{p.name}</span>
              {state.hostPlayerId === p.id && (
                <span
                  style={{
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
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function CountdownView({ state }: { state: PollinartPublicGameState }) {
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
        <div style={{ color: "var(--muted)", fontSize: 32 }}>
          Round {state.currentRound}
        </div>
        <div style={{ fontSize: 240, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
          {secs}
        </div>
      </div>
    </main>
  );
}

function PhaseStatus({
  state,
  title,
}: {
  state: PollinartPublicGameState;
  title: string;
}) {
  // How many of N players have submitted this step.
  const submitted = state.stepSubmittedCount;
  const expected = state.stepExpectedCount;
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 24, color: "var(--muted)" }}>
            Round {state.currentRound} / {state.config.totalRounds}
          </div>
          <h1 style={{ margin: 0, fontSize: 64, color: ACCENT }}>{title}</h1>
          {state.phase !== "WORD_PICK" && state.chains && state.chains[0] && (
            <div style={{ fontSize: 22, color: "var(--muted)" }}>
              Step {(state.stepIndex ?? 0) + 1} / {state.chains[0].chainLength}
            </div>
          )}
        </div>
        {state.phaseEndsAt && <Timer endsAt={state.phaseEndsAt} size={140} />}
      </div>
      <div
        style={{
          padding: 24,
          background: "var(--bg-elev)",
          borderRadius: 16,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 16 }}>
          {submitted} / {expected} submitted
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {state.players.map((p) => {
            // Who has submitted = roughly the live count of "stepIndex+1" submissions.
            // We don't have direct per-step submission state on the TV; show the
            // running cumulative count from liveStats as a proxy.
            const stats = state.liveStats?.[p.id];
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "var(--bg)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  opacity: p.connected ? 1 : 0.4,
                }}
              >
                <Avatar id={p.avatar} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20 }}>{p.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    {stats?.submitted ?? 0} submissions
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function RevealView({ state }: { state: PollinartPublicGameState }) {
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
    <main style={{ minHeight: "100dvh", padding: "32px 48px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0, color: ACCENT, fontSize: 48 }}>
          Chain {chainIndex + 1} / {summary.chains.length}
        </h1>
        <span style={{ color: "var(--muted)", fontSize: 22 }}>
          started by {startedByPlayer?.name ?? "someone"}
        </span>
      </div>
      <BigChainPlayback chain={chain} upToStep={stepIndex} state={state} />
    </main>
  );
}

function BigChainPlayback({
  chain,
  upToStep,
  state,
}: {
  chain: ChainRevealed;
  upToStep: number;
  state: PollinartPublicGameState;
}) {
  const entries: React.ReactNode[] = [];
  entries.push(
    <BigChainEntry
      key="seed"
      label="Seed word"
      playerName={state.players.find((p) => p.id === chain.startedBy)?.name ?? ""}
      content={
        <div style={{ fontSize: 56, fontWeight: 700, color: ACCENT }}>
          {chain.startingWord}
        </div>
      }
    />,
  );
  for (let i = 0; i <= Math.min(upToStep, chain.chainLength - 1); i++) {
    const step = chain.steps.find((s) => s.index === i);
    if (!step) continue;
    const player = state.players.find((p) => p.id === step.playerId);
    if (step.kind === "draw") {
      entries.push(
        <BigChainEntry
          key={i}
          label={`Step ${i + 1} · drew`}
          playerName={player?.name ?? ""}
          content={<DrawingReplay drawing={step.drawing} size={260} animate />}
        />,
      );
    } else {
      entries.push(
        <BigChainEntry
          key={i}
          label={`Step ${i + 1} · guessed`}
          playerName={player?.name ?? ""}
          content={
            <div style={{ fontSize: 40, color: "var(--fg)" }}>
              "{step.guess || <em style={{ color: "var(--muted)" }}>(no guess)</em>}"
              {step.isMatch && (
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 22,
                    padding: "2px 8px",
                    borderRadius: 8,
                    background: "rgba(127, 217, 127, 0.25)",
                  }}
                >
                  ✓ match
                </span>
              )}
            </div>
          }
        />,
      );
    }
  }
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        paddingBottom: 16,
        alignItems: "flex-start",
      }}
    >
      {entries}
    </div>
  );
}

function BigChainEntry({
  label,
  playerName,
  content,
}: {
  label: string;
  playerName: string;
  content: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: "var(--bg-elev)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        minWidth: 280,
        flexShrink: 0,
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 16 }}>{label}</div>
      <div style={{ color: "var(--fg)", fontSize: 22, marginBottom: 8 }}>
        {playerName}
      </div>
      <div>{content}</div>
    </div>
  );
}

function ResultsView({
  state,
  title,
  final,
}: {
  state: PollinartPublicGameState;
  title: string;
  final?: boolean;
}) {
  const sorted = [...state.players]
    .map((p) => ({ p, score: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return (
    <main style={{ minHeight: "100dvh", padding: "48px 64px", display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ margin: 0, color: ACCENT, fontSize: 64 }}>{title}</h1>
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 12,
          maxWidth: 800,
        }}
      >
        {sorted.map(({ p, score }, idx) => (
          <li
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 20px",
              background:
                idx === 0 && final ? "rgba(245, 180, 0, 0.25)" : "var(--bg-elev)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              fontSize: 28,
              opacity: p.connected ? 1 : 0.5,
            }}
          >
            <strong style={{ width: 32, textAlign: "center" }}>{idx + 1}</strong>
            <Avatar id={p.avatar} size={56} />
            <span style={{ flex: 1 }}>{p.name}</span>
            <strong>{score}</strong>
          </li>
        ))}
      </ol>
    </main>
  );
}
