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
import PausedOverlay from "../components/PausedOverlay";
import GameMenu from "../components/GameMenu";
import DrawingReplay from "../components/DrawingReplay";
import Fireworks from "../components/Fireworks";
import { sounds } from "../lib/sounds";
import type { Player, PublicGameState } from "../shared/types";
import type {
  ChainRevealed,
  PollinartComplexity,
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

  const disconnected = state.players.filter((p) => !p.connected);
  // Lightweight send wrapper so GameMenu can dispatch pause / stop /
  // switch-games from the TV. The host TV is implicitly trusted
  // (isHost), matching the WordHive and MathHive host displays.
  const sendFromTV = (msg: unknown) =>
    socketRef.current?.send(JSON.stringify(msg));
  // GameMenu expects the old-shape PublicGameState. The Pollinart
  // state shape has a wider phase union; we cast through unknown.
  const stateForMenu = state as unknown as PublicGameState;
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <ThemeToggle />
      <SoundUnlockPrompt />
      <GameMenu
        state={stateForMenu}
        send={sendFromTV as never}
        isHost
      />
      {view}
      {/* When a player disconnects mid-round, the room auto-pauses.
          The TV PausedOverlay shows the QR code + room code so the
          booted player can scan their phone back in. */}
      {state.paused && (
        <PausedOverlay
          roomCode={roomCode}
          disconnected={disconnected}
          showQR
          game="draw"
          onResume={() => sendFromTV({ type: "togglePause" })}
        />
      )}
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
  // Pair up (draw, guess) steps. With even-length chains every drawing
  // has a matching guess at the next index.
  const pairs: Array<{
    drawIndex: number;
    drawerName: string;
    drawing: ChainRevealed["steps"][number];
    guesserName: string;
    guess: ChainRevealed["steps"][number];
  }> = [];
  for (let i = 0; i + 1 < chain.chainLength; i += 2) {
    const d = chain.steps.find((s) => s.index === i);
    const g = chain.steps.find((s) => s.index === i + 1);
    if (!d || !g) continue;
    pairs.push({
      drawIndex: i,
      drawerName: state.players.find((p) => p.id === d.playerId)?.name ?? "",
      drawing: d,
      guesserName: state.players.find((p) => p.id === g.playerId)?.name ?? "",
      guess: g,
    });
  }
  const revealed = pairs.filter((p) => p.guess.index <= upToStep);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <BigSeedCard
        startingWord={chain.startingWord}
        starterName={state.players.find((p) => p.id === chain.startedBy)?.name ?? ""}
        tier={chain.tier}
      />
      {revealed.map((pair) => (
        <BigPairCard key={pair.drawIndex} pair={pair} />
      ))}
    </div>
  );
}

function BigSeedCard({
  startingWord,
  starterName,
  tier,
}: {
  startingWord: string;
  starterName: string;
  tier: PollinartComplexity;
}) {
  return (
    <div
      style={{
        padding: 20,
        background: "var(--bg-elev)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignSelf: "stretch",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <BigTierBadge tier={tier} />
      <div style={{ color: "var(--muted)", fontSize: 18 }}>
        {starterName} started with
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, color: ACCENT, textAlign: "center" }}>
        {startingWord}
      </div>
    </div>
  );
}

// TV-sized tier pill — visible across the room. Color-coded so the
// hard-chain (2× points) lane stands out from the easy lanes during
// the host's walkthrough.
function BigTierBadge({ tier }: { tier: PollinartComplexity }) {
  const meta: Record<
    PollinartComplexity,
    { label: string; bg: string; fg: string; mult: string }
  > = {
    easy: { label: "Easy", bg: "#3fa34d", fg: "#06140a", mult: "1×" },
    medium: { label: "Medium", bg: "#e8a13a", fg: "#1a1004", mult: "1.5×" },
    hard: { label: "Hard", bg: "#d24a52", fg: "#1f0608", mult: "2×" },
  };
  const m = meta[tier];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 14px",
        borderRadius: 999,
        fontSize: 18,
        fontWeight: 700,
        background: m.bg,
        color: m.fg,
      }}
    >
      {m.label}
      <span style={{ opacity: 0.8, fontWeight: 600 }}>{m.mult}</span>
    </span>
  );
}

function BigPairCard({
  pair,
}: {
  pair: {
    drawIndex: number;
    drawerName: string;
    drawing: ChainRevealed["steps"][number];
    guesserName: string;
    guess: ChainRevealed["steps"][number];
  };
}) {
  if (pair.drawing.kind !== "draw" || pair.guess.kind !== "guess") return null;
  const matched = pair.guess.isMatch;
  return (
    <div
      style={{
        padding: 16,
        background: "var(--bg-elev)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 16, alignSelf: "stretch" }}>
        {pair.drawerName} drew
      </div>
      <DrawingReplay drawing={pair.drawing.drawing} size={260} />
      <div
        style={{
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 22,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          {pair.guesserName} guessed
        </span>
        <strong style={{ color: "var(--fg)", flex: 1 }}>
          {pair.guess.guess ? (
            `"${pair.guess.guess}"`
          ) : (
            <em style={{ color: "var(--muted)" }}>(no guess)</em>
          )}
        </strong>
        <HostMatchBadge matched={matched} />
      </div>
    </div>
  );
}

function HostMatchBadge({ matched }: { matched: boolean }) {
  return (
    <span
      style={{
        fontSize: 16,
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: 14,
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
  const reactions = state.reactionsSummary;
  const winner = sorted[0];
  // Fire the fanfare once when FINAL_RESULTS first paints. SoundUnlock
  // prompt already nudged the host to unlock audio at lobby time;
  // sounds module is a no-op until the context is running.
  const fanfareFiredRef = useRef(false);
  useEffect(() => {
    if (!final) return;
    if (fanfareFiredRef.current) return;
    fanfareFiredRef.current = true;
    sounds.fanfare();
  }, [final]);
  return (
    <>
      {final && <Fireworks />}
      <main style={{ minHeight: "100dvh", padding: "48px 64px", display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ margin: 0, color: ACCENT, fontSize: 64 }}>{title}</h1>
        {final && winner && (
          <BigWinnerCard player={winner.p} score={winner.score} />
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: final && reactions ? "minmax(0, 1fr) minmax(0, 1.2fr)" : "1fr",
            gap: 32,
            alignItems: "start",
          }}
        >
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 12,
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
                <strong style={{ width: 40, textAlign: "center" }}>
                  {idx === 0 && final ? "🏆" : idx + 1}
                </strong>
                <Avatar id={p.avatar} size={56} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <strong>{score}</strong>
              </li>
            ))}
          </ol>
          {final && reactions && reactions.topDrawings.length > 0 && (
            <BigMostLoved state={state} reactions={reactions} />
          )}
        </div>
      </main>
    </>
  );
}

// TV-sized winner spotlight: trophy and copy on the left, oversized
// avatar pinned on the right per design ask.
function BigWinnerCard({ player, score }: { player: Player; score: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
        padding: "28px 36px",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(245,180,0,0.36), rgba(245,180,0,0.12))",
        border: "1px solid rgba(245,180,0,0.6)",
        boxShadow: "0 12px 48px rgba(245,180,0,0.22)",
      }}
    >
      <div
        style={{
          fontSize: 120,
          lineHeight: 1,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))",
        }}
        aria-hidden
      >
        🏆
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--muted)", fontSize: 22, letterSpacing: 2 }}>
          WINNER
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "var(--fg)", lineHeight: 1.1 }}>
          {player.name}
        </div>
        <div style={{ color: ACCENT, fontSize: 36, fontWeight: 700, marginTop: 6 }}>
          {score} pts
        </div>
      </div>
      <Avatar id={player.avatar} size={220} />
    </div>
  );
}

function BigMostLoved({
  state,
  reactions,
}: {
  state: PollinartPublicGameState;
  reactions: NonNullable<PollinartPublicGameState["reactionsSummary"]>;
}) {
  const top3 = reactions.topDrawings.slice(0, 3);
  const perPlayerEntries = Object.entries(reactions.perPlayer)
    .map(([pid, c]) => ({ pid, heart: c.heart, bee: c.bee, total: c.heart + c.bee }))
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total);
  return (
    <section
      style={{
        padding: 20,
        background: "var(--bg-elev)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h2 style={{ margin: 0, color: ACCENT, fontSize: 32 }}>
        Most loved drawings of the night
      </h2>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {top3.map((t) => {
          const drawer = state.players.find((p) => p.id === t.drawerId);
          return (
            <div
              key={`${t.chainId}|${t.stepIndex}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <DrawingReplay drawing={t.drawing} size={220} />
              <div style={{ fontSize: 18 }}>
                {drawer?.name ?? "someone"} — "{t.promptedWord}"
              </div>
              <div style={{ fontSize: 16, color: "var(--muted)" }}>
                ❤️ {t.heart} · 🐝 {t.bee}{" "}
                <span style={{ opacity: 0.6 }}>(R{t.roundNumber})</span>
              </div>
            </div>
          );
        })}
      </div>
      {perPlayerEntries.length > 0 && (
        <div>
          <div style={{ color: "var(--muted)", fontSize: 16, marginBottom: 6 }}>
            Reactions earned
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 6,
            }}
          >
            {perPlayerEntries.map((e) => {
              const p = state.players.find((q) => q.id === e.pid);
              if (!p) return null;
              return (
                <li
                  key={e.pid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 18,
                  }}
                >
                  <Avatar id={p.avatar} size={32} />
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span style={{ color: "var(--muted)" }}>
                    ❤️ {e.heart} · 🐝 {e.bee}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
