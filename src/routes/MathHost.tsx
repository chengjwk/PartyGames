import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PartySocket from "partysocket";
import { PARTY_HOST } from "../config";
import Avatar from "../components/Avatar";
import Timer from "../components/Timer";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import PausedOverlay from "../components/PausedOverlay";
import GameMenu from "../components/GameMenu";
import SoundUnlockPrompt from "../components/SoundUnlockPrompt";
import Fireworks from "../components/Fireworks";
import type {
  MathClientMessage,
  MathPublicGameState,
  MathServerMessage,
} from "../shared/math-types";
import type { PublicGameState, RoundConfig } from "../shared/types";

const ACCENT = "#6aa6ff";
const ACCENT_FG = "#0a1a2a";

function useMathRoomSocket(roomCode: string) {
  const [state, setState] = useState<MathPublicGameState | null>(null);
  const [switchAt, setSwitchAt] = useState<number | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  useEffect(() => {
    if (!roomCode) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      room: roomCode,
      party: "mathhive",
      query: { role: "host" },
    });
    const onMsg = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as MathServerMessage;
      if (msg.type === "state") setState(msg.state);
      else if (msg.type === "switchGames") setSwitchAt(Date.now());
    };
    socket.addEventListener("message", onMsg);
    socketRef.current = socket;
    return () => {
      socket.removeEventListener("message", onMsg);
      socket.close();
    };
  }, [roomCode]);
  const send = (msg: MathClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  };
  return { state, send, switchAt };
}

export default function MathHost() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const { state, send, switchAt } = useMathRoomSocket(roomCode);
  const nav = useNavigate();
  useEffect(() => {
    if (switchAt) nav(`/host/${roomCode}?reset=1`, { replace: true });
  }, [switchAt, roomCode, nav]);

  if (!state) {
    return (
      <>
        <GardenBackground />
        <FullscreenButton />
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 24 }}>
          Connecting...
        </main>
      </>
    );
  }

  let view: React.ReactNode = null;
  switch (state.phase) {
    case "LOBBY":
      view = <Lobby state={state} roomCode={roomCode} send={send} />;
      break;
    case "ROUND_STARTING":
      view = <RoundStarting state={state} />;
      break;
    case "ROUND_PLAYING":
      view = <RoundPlaying state={state} />;
      break;
    case "ROUND_RESULTS":
      view = <RoundResults state={state} send={send} />;
      break;
    case "FINAL_RESULTS":
      view = <FinalResults state={state} send={send} />;
      break;
  }
  const stateForMenu = state as unknown as PublicGameState;
  const disconnected = state.players.filter((p) => !p.connected);
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <SoundUnlockPrompt />
      <GameMenu state={stateForMenu} send={send as unknown as (m: unknown) => void as never} isHost />
      {view}
      {state.paused && (
        <PausedOverlay
          roomCode={roomCode}
          disconnected={disconnected}
          showQR
          game="math"
          onResume={() => send({ type: "togglePause" })}
        />
      )}
    </>
  );
}

function Lobby({
  state,
  roomCode,
  send,
}: {
  state: MathPublicGameState;
  roomCode: string;
  send: (m: MathClientMessage) => void;
}) {
  const playUrl = `${window.location.origin}/play/math/${roomCode}`;
  const cfg = state.config;
  const setCfg = (patch: Partial<RoundConfig>) => send({ type: "configure", config: patch });
  return (
    <main style={{ minHeight: "100dvh", padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
      <section style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 56, margin: 0, color: ACCENT }}>🧮 MathHive</h1>
        <p style={{ color: "var(--muted)", marginTop: 4 }}>Scan to join</p>
        <div style={{ background: "white", padding: 16, borderRadius: 12, display: "inline-block", marginTop: 16 }}>
          <QRCodeSVG value={playUrl} size={256} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: 12, marginTop: 16 }}>{roomCode}</div>
        <div style={{ fontFamily: "monospace", color: "var(--muted)" }}>{playUrl}</div>
      </section>
      <section>
        <h2 style={{ fontSize: 32, marginTop: 0 }}>
          Players <span style={{ color: "var(--muted)" }}>({state.players.length})</span>
        </h2>
        {state.players.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Waiting for players to join…</p>
        ) : (
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
                <span style={{ flex: 1 }}>
                  {p.name}
                  {state.hostPlayerId === p.id && (
                    <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 6px", borderRadius: 4, background: ACCENT, color: ACCENT_FG, fontWeight: 700 }}>HOST</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 24, padding: 16, border: "1px solid var(--border)", borderRadius: 12, display: "grid", gap: 12 }}>
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
        </div>
        <button
          onClick={() => send({ type: "startGame" })}
          disabled={state.players.length === 0}
          style={{ fontSize: 22, padding: "16px 32px", marginTop: 24, width: "100%", background: ACCENT, color: ACCENT_FG }}
        >
          Start Game
        </button>
      </section>
    </main>
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
        <p style={{ color: "var(--muted)", fontSize: 24 }}>
          Round {state.currentRound} of {state.config.totalRounds}
        </p>
        <div style={{ fontSize: 320, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
          {remaining || "GO"}
        </div>
      </div>
    </main>
  );
}

function RoundPlaying({ state }: { state: MathPublicGameState }) {
  const puzzle = state.puzzle;
  if (!puzzle || !state.roundEndsAt) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <span style={{ color: "var(--muted)" }}>Loading round...</span>
      </main>
    );
  }
  const players = state.players;
  return (
    <main style={{ minHeight: "100dvh", padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, flex: 1 }}>
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 18 }}>Round {state.currentRound} of {state.config.totalRounds}</div>
          <Timer endsAt={state.roundEndsAt} />
          <div style={{ marginTop: 24 }}>
            <DigitHoneycomb
              centerOperator={puzzle.centerOperator}
              outerDigits={puzzle.outerDigits}
            />
          </div>
        </section>
        <section style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ marginTop: 0, fontSize: 32 }}>Players</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {players.map((p) => (
              <li
                key={p.id}
                style={{
                  padding: "12px 16px",
                  background: "var(--bg-elev)",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 24,
                  opacity: p.connected ? 1 : 0.4,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Avatar id={p.avatar} size={60} />
                  <span>{p.name}</span>
                </span>
                <span style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  {state.liveCounts && (
                    <span style={{ color: "var(--muted)", fontSize: 16 }}>
                      {state.liveCounts[p.id] ?? 0} found
                    </span>
                  )}
                  <span style={{ color: "var(--muted)", fontSize: 16 }}>{state.totalScores[p.id] ?? 0} pts</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {state.easyModeStats && (
        <EasyModePanel found={state.easyModeStats.foundEquations} />
      )}
    </main>
  );
}

const OP_GLYPH: Record<string, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function DigitHoneycomb({
  centerOperator,
  outerDigits,
}: {
  centerOperator: string;
  outerDigits: string[];
}) {
  const HEX_R = 70;
  const HEX_W = HEX_R * Math.sqrt(3);
  const D = HEX_W;
  const ext = D + HEX_W / 2 + 20;
  return (
    <svg width={ext * 2} height={ext * 2} viewBox={`${-ext} ${-ext} ${ext * 2} ${ext * 2}`}>
      <g>
        <polygon points={hexPoints(HEX_R)} fill={ACCENT} stroke="var(--border)" strokeWidth={2} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={HEX_R * 1.1} fontWeight={800} fill={ACCENT_FG}>
          {OP_GLYPH[centerOperator] ?? centerOperator}
        </text>
      </g>
      {outerDigits.map((d, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = D * Math.cos(angle);
        const y = D * Math.sin(angle);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <polygon points={hexPoints(HEX_R)} fill="var(--bg-elev)" stroke="var(--border)" strokeWidth={2} />
            <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={HEX_R * 0.95} fontWeight={800} fill="var(--fg)">{d}</text>
          </g>
        );
      })}
    </svg>
  );
}

function hexPoints(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function EasyModePanel({ found }: { found: string[] }) {
  return (
    <div style={{ padding: "14px 24px", background: "var(--bg-elev)", borderRadius: 14, display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT, whiteSpace: "nowrap" }}>
        {found.length} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 14 }}>equations found</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 80, overflowY: "auto" }}>
        {found.length === 0 ? (
          <span style={{ color: "var(--muted)", fontSize: 14, fontStyle: "italic" }}>
            Equations appear here as the room finds them.
          </span>
        ) : (
          found.map((e) => (
            <span key={e} style={{ background: "var(--bg)", padding: "3px 9px", borderRadius: 5, fontSize: 14, fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "var(--muted)" }}>
              {prettyEq(e)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function RoundResults({
  state,
  send,
}: {
  state: MathPublicGameState;
  send: (m: MathClientMessage) => void;
}) {
  const summary = state.roundSummary;
  if (!summary) return null;
  const sorted = [...summary.perPlayer].sort((a, b) => b.scoreThisRound - a.scoreThisRound);
  const playersById = new Map(state.players.map((p) => [p.id, p]));
  const topScore = sorted[0]?.scoreThisRound ?? 0;
  const isFinal = state.currentRound >= state.config.totalRounds;
  return (
    <main style={{ minHeight: "100dvh", padding: 32, maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 36 }}>Round {state.currentRound} results</h1>
        <button onClick={() => send({ type: "nextRound" })} style={{ fontSize: 22, padding: "12px 24px", background: ACCENT, color: ACCENT_FG }}>
          {isFinal ? "Show final results →" : "Next round →"}
        </button>
      </header>
      <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
        {sorted.map((r) => {
          const p = playersById.get(r.playerId);
          const isTop = topScore > 0 && r.scoreThisRound === topScore;
          const size = isTop ? 200 : 160;
          return (
            <div
              key={r.playerId}
              style={{
                background: isTop ? ACCENT : "var(--bg-elev)",
                color: isTop ? ACCENT_FG : "var(--fg)",
                padding: "22px 24px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                gap: 24,
              }}
            >
              {p && <Avatar id={p.avatar} size={size} bg={!isTop} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span style={{ fontSize: 30, fontWeight: 700, flex: 1 }}>
                    {p?.name ?? "—"}
                    {isTop && <span style={{ marginLeft: 12, fontSize: 26 }}>🏅</span>}
                  </span>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>+{r.scoreThisRound}</div>
                </div>
                {r.equations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    {r.equations.map((eq) => (
                      <EquationChip key={eq.equation} eq={eq} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function EquationChip({ eq }: { eq: { equation: string; points: number; pangram: boolean; firstFinder: boolean } }) {
  return (
    <span
      style={{
        background: eq.pangram ? ACCENT : "var(--bg)",
        color: eq.pangram ? ACCENT_FG : "var(--fg)",
        border: "1px solid var(--border)",
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 22,
        fontWeight: 700,
        fontFamily: "ui-monospace, monospace",
      }}
    >
      {prettyEq(eq.equation)} <span style={{ opacity: 0.7, fontSize: 16 }}>+{eq.points}</span>
      {eq.firstFinder && <span style={{ marginLeft: 4 }}>★</span>}
    </span>
  );
}

function FinalResults({
  state,
  send,
}: {
  state: MathPublicGameState;
  send: (m: MathClientMessage) => void;
}) {
  const ranked = [...state.players]
    .map((p) => ({ player: p, total: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const winner = ranked[0];
  return (
    <>
      <Fireworks />
      <main style={{ minHeight: "100dvh", padding: 32, maxWidth: 1400, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 56, marginBottom: 8 }}>Final Results</h1>
        {winner && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 18,
              padding: "16px 28px",
              borderRadius: 16,
              background: ACCENT,
              color: ACCENT_FG,
              marginBottom: 28,
              fontSize: 32,
              fontWeight: 700,
              boxShadow: "0 0 40px rgba(106, 166, 255, 0.4)",
            }}
          >
            <Avatar id={winner.player.avatar} size={104} bg={false} />
            <span>
              {winner.player.name} wins with <strong>{winner.total}</strong> pts
            </span>
          </div>
        )}
        <ol style={{ listStyle: "none", padding: 0, margin: "32px 0 0", display: "grid", gap: 18 }}>
          {ranked.map((row, i) => {
            const isWinner = i === 0;
            const topEqs = state.playerTopEquations?.[row.player.id] ?? [];
            return (
              <li
                key={row.player.id}
                style={{
                  background: isWinner ? ACCENT : "var(--bg-elev)",
                  color: isWinner ? ACCENT_FG : "var(--fg)",
                  padding: "22px 24px",
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  fontWeight: isWinner ? 700 : 400,
                  textAlign: "left",
                }}
              >
                <Avatar id={row.player.avatar} size={isWinner ? 220 : 180} bg={!isWinner} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14, fontSize: 32 }}>
                    <span style={{ opacity: 0.7 }}>#{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {row.player.name}
                      {isWinner && <span style={{ marginLeft: 12, fontSize: 28 }}>👑</span>}
                    </span>
                    <strong style={{ fontSize: 36 }}>{row.total} pts</strong>
                  </div>
                  {topEqs.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 13, opacity: 0.65, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
                        Top {topEqs.length} equation{topEqs.length === 1 ? "" : "s"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {topEqs.map((eq) => (
                          <EquationChip key={eq.equation} eq={eq} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <button onClick={() => send({ type: "playAgain" })} style={{ fontSize: 22, padding: "16px 32px", marginTop: 32, background: ACCENT, color: ACCENT_FG }}>
          Play again
        </button>
      </main>
    </>
  );
}

function prettyEq(eq: string): string {
  return eq.replace(/\*/g, "×").replace(/\//g, "÷");
}
