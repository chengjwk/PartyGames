import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useRoomSocket } from "../lib/useRoomSocket";
import { sounds } from "../lib/sounds";
import Timer from "../components/Timer";
import FullscreenButton from "../components/FullscreenButton";
import PausedOverlay from "../components/PausedOverlay";
import GardenBackground from "../components/GardenBackground";
import Fireworks from "../components/Fireworks";
import Avatar from "../components/Avatar";
import GameMenu from "../components/GameMenu";
import type { ActiveBee, PublicGameState, RoundConfig, RoundSummary } from "../shared/types";

export default function Host() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const { state, send, switchAt } = useRoomSocket(roomCode, "host");
  const nav = useNavigate();
  useEffect(() => {
    if (switchAt) nav(`/host/${roomCode}?reset=1`, { replace: true });
  }, [switchAt, roomCode, nav]);
  usePhaseAudio(state?.phase);
  // Pre-round 3-2-1 ticks (countdown before the round starts).
  useTickAudio(state?.phase === "ROUND_STARTING" ? state.roundStartsAt : null);
  usePangramAudio(state?.gameStats ? (state.lastPangramAt ?? null) : null);
  useBeeAudio(state?.bees);
  usePauseAudio(state?.paused ?? false);

  if (!state) return <FullPage>Connecting…</FullPage>;

  let view: React.ReactNode;
  switch (state.phase) {
    case "LOBBY":
      view = <Lobby roomCode={roomCode} state={state} send={send} />;
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
  const disconnected = state.players.filter((p) => !p.connected);
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <GameMenu state={state} send={send} isHost />
      {view}
      {state.paused && (
        <PausedOverlay
          roomCode={roomCode}
          disconnected={disconnected}
          showQR
          onResume={() => send({ type: "togglePause" })}
        />
      )}
    </>
  );
}

function RoundStarting({ state }: { state: PublicGameState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(i);
  }, []);
  if (!state.roundStartsAt) return <FullPage>Get ready...</FullPage>;
  const remaining = Math.max(0, Math.ceil((state.roundStartsAt - now) / 1000));
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div>
        <p style={{ color: "var(--muted)", fontSize: 24, margin: 0 }}>
          Round {state.currentRound} of {state.config.totalRounds}
        </p>
        <div style={{ fontSize: 320, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
          {remaining || "GO"}
        </div>
      </div>
    </main>
  );
}

// Plays shared room sounds (round start/end, game end) when phase transitions
// on the host display. Phones don't play these — only their own per-submit
// feedback.
function usePhaseAudio(phase: string | undefined) {
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (!phase) return;
    const before = prev.current;
    prev.current = phase;
    if (before === null) return;
    if (phase === "ROUND_PLAYING" && before === "ROUND_STARTING") sounds.roundStart();
    if (phase === "ROUND_RESULTS" && before === "ROUND_PLAYING") sounds.roundEnd();
    if (phase === "FINAL_RESULTS") sounds.fanfare();
  }, [phase]);
}

// Tick beeps at remaining = 3s, 2s, 1s before some scheduled instant.
// Used both for the end-of-round countdown and the pre-round countdown.
function useTickAudio(target: number | null | undefined) {
  useEffect(() => {
    if (!target) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const sec of [3, 2, 1]) {
      const ms = target - Date.now() - sec * 1000;
      if (ms <= 0) continue;
      timers.push(
        setTimeout(() => {
          if (sec === 1) sounds.tickFinal();
          else sounds.tick();
        }, ms),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [target]);
}

// Plays the pangram fanfare any time the server reports a new pangram.
function usePangramAudio(lastPangramAt: number | null) {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = lastPangramAt;
    if (before === null) return; // skip initial value (server reset)
    if (lastPangramAt && lastPangramAt !== before) sounds.pangram();
  }, [lastPangramAt]);
}

// Plays bee-in / bee-out / queen-in sounds based on diff of the bees array.
function useBeeAudio(bees: ActiveBee[] | undefined) {
  const prev = useRef<ActiveBee[]>([]);
  useEffect(() => {
    const cur = bees ?? [];
    const beeKey = (b: ActiveBee) => `${b.slot}:${b.letter}:${b.queen ? "Q" : "W"}`;
    const prevKeys = new Set(prev.current.map(beeKey));
    const curKeys = new Set(cur.map(beeKey));
    // Arrivals
    for (const b of cur) {
      if (!prevKeys.has(beeKey(b))) {
        if (b.queen) sounds.queenIn();
        else sounds.beeIn();
      }
    }
    // Departures
    for (const b of prev.current) {
      if (!curKeys.has(beeKey(b))) sounds.beeOut();
    }
    prev.current = cur;
  }, [bees]);
}

// Soft chime on pause / resume.
function usePauseAudio(paused: boolean) {
  const prev = useRef<boolean | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = paused;
    if (before === null) return;
    if (paused && !before) sounds.pauseDown();
    if (!paused && before) sounds.pauseUp();
  }, [paused]);
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
        fontSize: 24,
      }}
    >
      {children}
    </main>
  );
}

function Lobby({
  roomCode,
  state,
  send,
}: {
  roomCode: string;
  state: PublicGameState;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
  const playUrl = `${window.location.origin}/play/word/${roomCode}`;
  const players = state.players;
  const cfg = state.config;

  const setCfg = (patch: Partial<RoundConfig>) => send({ type: "configure", config: patch });

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
        <h1 style={{ fontSize: 56, margin: 0, color: "var(--accent)" }}>WordHive</h1>
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
          Players <span style={{ color: "var(--muted)" }}>({players.length})</span>
        </h2>
        {players.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Waiting for players to join…</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {players.map((p) => (
              <li
                key={p.id}
                style={{
                  fontSize: 22,
                  padding: "10px 14px",
                  background: "var(--bg-elev)",
                  borderRadius: 8,
                  marginBottom: 8,
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
                        verticalAlign: "middle",
                      }}
                    >
                      HOST
                    </span>
                  )}
                </span>
                {p.scoreMultiplier !== 1 && (
                  <span style={{ color: "var(--muted)", fontSize: 16 }}>{p.scoreMultiplier}x</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid var(--border)",
            borderRadius: 12,
            display: "grid",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>Settings</h3>
          <ConfigRow label="Mode">
            <ModeToggle
              value={cfg.mode}
              onChange={(m) => setCfg({ mode: m })}
            />
          </ConfigRow>
          <ConfigRow label="Rounds">
            <Stepper
              value={cfg.totalRounds}
              min={1}
              max={10}
              onChange={(v) => setCfg({ totalRounds: v })}
            />
          </ConfigRow>
          <ConfigRow label="Round duration (sec)">
            <Stepper
              value={cfg.roundDurationSeconds}
              min={cfg.mode === "swarm" ? 60 : 15}
              max={600}
              step={15}
              onChange={(v) => setCfg({ roundDurationSeconds: v })}
            />
          </ConfigRow>
          <ConfigRow label="Show detailed live stats on TV">
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
          disabled={players.length === 0}
          style={{ fontSize: 22, padding: "16px 32px", marginTop: 24, width: "100%" }}
        >
          Start Game
        </button>
      </section>
    </main>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: "classic" | "swarm";
  onChange: (m: "classic" | "swarm") => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, background: "var(--bg)", borderRadius: 8, padding: 4 }}>
      {(["classic", "swarm"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "6px 14px",
            fontSize: 14,
            fontWeight: 600,
            background: value === m ? "var(--accent)" : "transparent",
            color: value === m ? "var(--accent-fg)" : "var(--fg)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {m}
        </button>
      ))}
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
      <button onClick={() => onChange(Math.max(min, value - step))} style={{ padding: "4px 12px" }}>
        −
      </button>
      <span style={{ minWidth: 48, textAlign: "center", fontWeight: 700 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} style={{ padding: "4px 12px" }}>
        +
      </button>
    </div>
  );
}

function RoundPlaying({ state }: { state: PublicGameState }) {
  const puzzle = state.puzzle;
  useTickAudio(state.roundEndsAt);
  if (!puzzle || !state.roundEndsAt) return <FullPage>Loading round…</FullPage>;
  const players = state.players;
  const liveCounts = state.liveCounts;

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, flex: 1 }}>
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 18 }}>
            Round {state.currentRound} of {state.config.totalRounds}
          </div>
          <Timer endsAt={state.roundEndsAt} />
          <div style={{ marginTop: 24 }}>
            <BigHoneycomb
              letters={puzzle.letters}
              bonusLetter={puzzle.bonusLetter}
              bees={state.bees}
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
                <span>
                  {p.name}
                  {p.scoreMultiplier !== 1 && (
                    <span style={{ color: "var(--muted)", fontSize: 14, marginLeft: 6 }}>
                      ({p.scoreMultiplier}x)
                    </span>
                  )}
                </span>
              </span>
              <span style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                {liveCounts && (
                  <span style={{ color: "var(--muted)", fontSize: 16 }}>
                    {liveCounts[p.id] ?? 0} found
                  </span>
                )}
                <span style={{ color: "var(--muted)", fontSize: 16 }}>
                  {state.totalScores[p.id] ?? 0} pts (overall)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      </div>
      {state.easyModeStats && <EasyModePanel stats={state.easyModeStats} />}
    </main>
  );
}

function EasyModePanel({
  stats,
}: {
  stats: { totalValid: number; foundWords: string[] };
}) {
  return (
    <div
      style={{
        padding: "14px 24px",
        background: "var(--bg-elev)",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          whiteSpace: "nowrap",
          color: "var(--accent)",
        }}
      >
        {stats.foundWords.length}
        <span style={{ color: "var(--muted)", fontWeight: 400 }}> / {stats.totalValid}</span>
        <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 400, marginLeft: 8 }}>found</span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
          maxHeight: 80,
          overflowY: "auto",
        }}
      >
        {stats.foundWords.length === 0 ? (
          <span style={{ color: "var(--muted)", fontSize: 14, fontStyle: "italic" }}>
            Words will appear here as the room finds them.
          </span>
        ) : (
          stats.foundWords.map((w) => (
            <span
              key={w}
              style={{
                background: "var(--bg)",
                padding: "3px 9px",
                borderRadius: 5,
                fontSize: 14,
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--muted)",
              }}
            >
              {w}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function BestWordsRow({
  longest,
  longestPlayer,
  highest,
  highestPlayer,
}: {
  longest: { word: string; playerId: string } | null;
  longestPlayer: { name: string; avatar: string } | null | undefined;
  highest: { word: string; points: number; playerId: string } | null;
  highestPlayer: { name: string; avatar: string } | null | undefined;
}) {
  if (!longest && !highest) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginTop: 4,
      }}
    >
      {longest && longestPlayer && (
        <BestCard
          title="Longest word"
          word={longest.word}
          subtitle={`${longest.word.length} letters`}
          player={longestPlayer}
        />
      )}
      {highest && highestPlayer && (
        <BestCard
          title="Highest scoring"
          word={highest.word}
          subtitle={`${highest.points} pts`}
          player={highestPlayer}
        />
      )}
    </div>
  );
}

function BestCard({
  title,
  word,
  subtitle,
  player,
}: {
  title: string;
  word: string;
  subtitle: string;
  player: { name: string; avatar: string };
}) {
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 18px",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: 14, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 2,
          color: "var(--accent)",
          marginTop: 4,
        }}
      >
        {word}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 18 }}>
        <Avatar id={player.avatar} size={56} />
        <span>{player.name}</span>
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{subtitle}</span>
      </div>
    </div>
  );
}

// A non-interactive version for the host display
function BigHoneycomb({
  letters,
  bonusLetter,
  bees,
}: {
  letters: string[];
  bonusLetter?: string;
  bees?: ActiveBee[];
}) {
  const [center, ...outer] = letters;
  const HEX_R = 70;
  const HEX_W = HEX_R * Math.sqrt(3);
  const D = HEX_W;

  const topX = 0;
  const topY = -D;

  const beesArr = bees ?? [];
  const floater = beesArr.find((b) => b.slot === -1) ?? null;
  const queen = beesArr.find((b) => b.slot === 0) ?? null;
  const beeByOuter = new Map<number, ActiveBee>();
  for (const b of beesArr) {
    if (b.slot >= 1 && b.slot <= 6) beeByOuter.set(b.slot, b);
  }

  // Classic floating-bee fade-out.
  const [displayedFloat, setDisplayedFloat] = useState<string | null>(floater?.letter ?? null);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (floater && floater.letter !== displayedFloat) {
      setDisplayedFloat(floater.letter);
      setExiting(false);
    } else if (!floater && displayedFloat && !exiting) {
      setExiting(true);
      const t = setTimeout(() => {
        setDisplayedFloat(null);
        setExiting(false);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [floater, displayedFloat, exiting]);

  const ext = D + HEX_W / 2 + 30;
  const topPad = HEX_R * 2 + 40;
  const vbX = -ext;
  const vbY = -ext - topPad;
  const vbW = ext * 2;
  const vbH = ext * 2 + topPad;
  return (
    <svg
      width={ext * 2}
      height={ext * 2 + topPad}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      style={{ overflow: "visible" }}
    >
      <style>{`
        @keyframes host-bee-in {
          0%   { transform: translate(-160px, -160px) rotate(-25deg); opacity: 0; }
          30%  { opacity: 1; }
          60%  { transform: translate(10px, -6px) rotate(8deg); }
          100% { transform: translate(0, 0) rotate(0); opacity: 1; }
        }
        @keyframes host-bee-out {
          0%   { transform: translate(0, 0) rotate(0); opacity: 1; }
          100% { transform: translate(220px, -160px) rotate(35deg); opacity: 0; }
        }
        @keyframes host-bee-bob {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes host-worker-in {
          0%   { transform: translate(var(--fx), var(--fy)) rotate(var(--fr)) scale(0.55); opacity: 0; }
          45%  { opacity: 1; }
          70%  { transform: translate(8px, -6px) rotate(8deg) scale(1.12); }
          100% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes host-queen-in {
          0%   { transform: translate(0, -80px) scale(0.2); opacity: 0; }
          45%  { opacity: 1; }
          65%  { transform: translate(0, 5px) scale(1.2); }
          100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes host-swarm-bob {
          0%,100% { transform: translate(0, 0); }
          50% { transform: translate(0, -4px); }
        }
      `}</style>
      {/* Center hex (queen replaces during her window) */}
      <g transform={`translate(0 0)`}>
        {queen ? (
          <g key={`queen-${queen.letter}`} style={hostBeeAnim("queen")}>
            <polygon
              points={hexPoints(HEX_R)}
              fill="var(--accent)"
              stroke="#fff"
              strokeWidth={5}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={HEX_R * 0.95}
              fontWeight={800}
              fill="var(--accent-fg)"
              style={{ textTransform: "uppercase" }}
            >
              {queen.letter.toUpperCase()}
            </text>
            <text
              x={HEX_R * 0.55}
              y={-HEX_R * 0.55}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={HEX_R * 0.4}
              fontWeight={800}
              fill="#1a1a1f"
            >
              5×
            </text>
            <text
              x={-HEX_R * 0.55}
              y={-HEX_R * 0.55}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={HEX_R * 0.45}
            >
              👑
            </text>
          </g>
        ) : (
          <>
            <polygon
              points={hexPoints(HEX_R)}
              fill="var(--accent)"
              stroke="var(--border)"
              strokeWidth={2}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={HEX_R * 0.95}
              fontWeight={800}
              fill="var(--accent-fg)"
              style={{ textTransform: "uppercase" }}
            >
              {center.toUpperCase()}
            </text>
          </>
        )}
      </g>
      {outer.map((origLetter, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = D * Math.cos(angle);
        const y = D * Math.sin(angle);
        const bee = beeByOuter.get(i + 1);
        if (bee) {
          return (
            <g key={`bee-${i}-${bee.letter}`} transform={`translate(${x} ${y})`}>
              <g style={hostBeeAnim("worker")}>
                <polygon
                  points={hexPoints(HEX_R)}
                  fill="var(--accent)"
                  stroke="var(--accent)"
                  strokeWidth={5}
                />
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={HEX_R * 0.95}
                  fontWeight={800}
                  fill="var(--accent-fg)"
                  style={{ textTransform: "uppercase" }}
                >
                  {bee.letter.toUpperCase()}
                </text>
                <text
                  x={HEX_R * 0.55}
                  y={-HEX_R * 0.55}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={HEX_R * 0.4}
                  fontWeight={800}
                  fill="#1a1a1f"
                >
                  {bee.multiplier}×
                </text>
                <g transform={`translate(${-HEX_R * 0.55} ${-HEX_R * 0.55}) scale(-1 1)`}>
                  <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={HEX_R * 0.4}>
                    🐝
                  </text>
                </g>
              </g>
            </g>
          );
        }
        const isBonus = bonusLetter === origLetter;
        return (
          <g key={`${origLetter}-${i}`} transform={`translate(${x} ${y})`}>
            <polygon
              points={hexPoints(HEX_R)}
              fill={isBonus ? "#3a3a18" : "var(--bg-elev)"}
              stroke={isBonus ? "var(--accent)" : "var(--border)"}
              strokeWidth={isBonus ? 4 : 2}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={HEX_R * 0.95}
              fontWeight={800}
              fill="var(--fg)"
              style={{ textTransform: "uppercase" }}
            >
              {origLetter.toUpperCase()}
            </text>
            {isBonus && (
              <text
                x={HEX_R * 0.6}
                y={-HEX_R * 0.55}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={HEX_R * 0.32}
                fontWeight={800}
                fill="var(--accent)"
              >
                2×
              </text>
            )}
          </g>
        );
      })}
      {displayedFloat && (
        // Outer g positions, inner g animates. Splitting them avoids the CSS
        // transform from the animation overriding the SVG translate attribute
        // (the bee was landing at 0,0 — i.e. the center hex).
        <g key={displayedFloat} transform={`translate(${topX} ${topY - HEX_R * 1.85})`}>
          <g
            style={{
              animation: exiting
                ? "host-bee-out 0.65s ease-in forwards"
                : "host-bee-in 0.7s ease-out, host-bee-bob 1.6s ease-in-out 0.7s infinite",
              transformOrigin: "center",
            }}
          >
            <g transform={`translate(${-HEX_R * 0.55} 0) scale(-1 1)`}>
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={HEX_R * 1.4}
              >
                🐝
              </text>
            </g>
            <text
              x={HEX_R * 0.55}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={HEX_R * 1.1}
              fontWeight={800}
              fill="var(--accent)"
              stroke="var(--accent-fg)"
              strokeWidth={4}
              paintOrder="stroke"
              style={{ textTransform: "uppercase" }}
            >
              {displayedFloat.toUpperCase()}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

const HOST_CORNERS: ReadonlyArray<{ "--fx": string; "--fy": string; "--fr": string }> = [
  { "--fx": "-140px", "--fy": "-140px", "--fr": "-28deg" },
  { "--fx": "140px", "--fy": "-140px", "--fr": "28deg" },
  { "--fx": "-140px", "--fy": "140px", "--fr": "-22deg" },
  { "--fx": "140px", "--fy": "140px", "--fr": "22deg" },
];

function hostBeeAnim(kind: "worker" | "queen"): React.CSSProperties {
  if (kind === "queen") {
    return {
      animation:
        "host-queen-in 0.65s cubic-bezier(.2,.7,.3,1.4), host-swarm-bob 1.6s ease-in-out 0.65s infinite",
      transformOrigin: "center",
    };
  }
  const c = HOST_CORNERS[Math.floor(Math.random() * HOST_CORNERS.length)];
  return {
    animation:
      "host-worker-in 0.55s cubic-bezier(.2,.7,.3,1.4), host-swarm-bob 1.4s ease-in-out 0.55s infinite",
    transformOrigin: "center",
    ...(c as React.CSSProperties),
  };
}

function hexPoints(r: number): string {
  // Flat-top hex (vertices at 0°, 60°, …) — pairs cleanly with the outer
  // offsets which sit at 30°, 90°, … so all 6 neighbors share edges.
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function RoundResults({
  state,
  send,
}: {
  state: PublicGameState;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
  const summary = state.roundSummary;
  if (!summary) return <FullPage>Loading…</FullPage>;
  const isFinal = state.currentRound >= state.config.totalRounds;
  return (
    <main style={{ minHeight: "100dvh", padding: 32, maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 36 }}>
          Round {state.currentRound} results
        </h1>
        <button
          onClick={() => send({ type: "nextRound" })}
          style={{ fontSize: 22, padding: "12px 24px" }}
        >
          {isFinal ? "Show final results →" : "Next round →"}
        </button>
      </header>

      <PangramReveal summary={summary} />
      <PerPlayerResults state={state} summary={summary} />
    </main>
  );
}

function PangramReveal({ summary }: { summary: RoundSummary }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 8 }}>
        Pangrams <span style={{ color: "var(--muted)", fontSize: 18 }}>(used all 7 letters)</span>
      </h2>
      {summary.pangrams.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>None for this puzzle.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {summary.pangrams.map((w) => (
            <div
              key={w}
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
                padding: "10px 16px",
                borderRadius: 10,
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{w}</span>
              {summary.definitions[w] && (
                <span style={{ fontSize: 18, opacity: 0.85, flex: 1, minWidth: 240 }}>
                  {summary.definitions[w]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PerPlayerResults({ state, summary }: { state: PublicGameState; summary: RoundSummary }) {
  const sorted = [...summary.perPlayer].sort((a, b) => b.scoreThisRound - a.scoreThisRound);
  const playersById = new Map(state.players.map((p) => [p.id, p]));
  const topScore = sorted[0]?.scoreThisRound ?? 0;
  return (
    <section style={{ marginTop: 32 }}>
      <h2>Scores</h2>
      <div style={{ display: "grid", gap: 18 }}>
        {sorted.map((r) => {
          const p = playersById.get(r.playerId);
          const isTop = topScore > 0 && r.scoreThisRound === topScore;
          const avatarSize = isTop ? 200 : 160;
          return (
            <div
              key={r.playerId}
              style={{
                background: isTop ? "var(--accent)" : "var(--bg-elev)",
                color: isTop ? "var(--accent-fg)" : "var(--fg)",
                padding: "22px 24px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                gap: 24,
                boxShadow: isTop ? "0 0 28px rgba(245, 180, 0, 0.3)" : undefined,
              }}
            >
              {p && <Avatar id={p.avatar} size={avatarSize} bg={!isTop} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 14,
                  }}
                >
                  <span style={{ fontSize: 30, fontWeight: 700, flex: 1 }}>
                    {p?.name ?? "—"}
                    {isTop && <span style={{ marginLeft: 12, fontSize: 26 }}>🏅</span>}
                  </span>
                  <div style={{ fontSize: 32, fontWeight: 800, whiteSpace: "nowrap" }}>
                    +{r.scoreThisRound}
                    <span style={{ opacity: 0.65, fontSize: 18, fontWeight: 400, marginLeft: 8 }}>
                      ({state.totalScores[r.playerId] ?? 0} total)
                    </span>
                  </div>
                </div>
                {r.words.length === 0 ? (
                  <p style={{ opacity: 0.7, marginTop: 8 }}>No words found.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    {r.words.map((w) => (
                      <WordChip key={w.word} word={w} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WordChip({ word }: { word: { word: string; points: number; isPangram: boolean; firstFinder: boolean } }) {
  return (
    <span
      style={{
        background: word.isPangram ? "var(--accent)" : "var(--bg)",
        color: word.isPangram ? "var(--accent-fg)" : "var(--fg)",
        border: "1px solid var(--border)",
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 22,
        textTransform: "uppercase",
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
      title={`${word.points} pts${word.firstFinder ? " (first finder)" : ""}${word.isPangram ? " (pangram)" : ""}`}
    >
      {word.word} <span style={{ opacity: 0.7, fontSize: 16 }}>+{word.points}</span>
      {word.firstFinder && <span style={{ marginLeft: 4 }}>★</span>}
    </span>
  );
}

function FinalResults({
  state,
  send,
}: {
  state: PublicGameState;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
  const ranked = [...state.players]
    .map((p) => ({ player: p, total: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const winner = ranked[0];
  const playersById = new Map(state.players.map((p) => [p.id, p]));
  const longestPlayer = state.gameStats.longest
    ? playersById.get(state.gameStats.longest.playerId)
    : null;
  const highestPlayer = state.gameStats.highest
    ? playersById.get(state.gameStats.highest.playerId)
    : null;

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
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "0 0 40px rgba(245, 180, 0, 0.35)",
              marginBottom: 28,
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            <Avatar id={winner.player.avatar} size={104} bg={false} />
            <span>
              {winner.player.name} wins with <strong>{winner.total}</strong> pts
            </span>
          </div>
        )}

        <BestWordsRow
          longest={state.gameStats.longest}
          longestPlayer={longestPlayer}
          highest={state.gameStats.highest}
          highestPlayer={highestPlayer}
        />

        <ol style={{ listStyle: "none", padding: 0, margin: "32px 0 0", display: "grid", gap: 18 }}>
          {ranked.map((row, i) => {
            const isWinner = i === 0;
            const topWords = state.playerTopWords?.[row.player.id] ?? [];
            const avatarSize = isWinner ? 220 : 180;
            return (
              <li
                key={row.player.id}
                style={{
                  background: isWinner ? "var(--accent)" : "var(--bg-elev)",
                  color: isWinner ? "var(--accent-fg)" : "var(--fg)",
                  padding: "22px 24px",
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  fontWeight: isWinner ? 700 : 400,
                  boxShadow: isWinner ? "0 0 36px rgba(245, 180, 0, 0.4)" : undefined,
                  textAlign: "left",
                }}
              >
                <Avatar id={row.player.avatar} size={avatarSize} bg={!isWinner} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 14,
                      fontSize: 32,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>#{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {row.player.name}
                      {isWinner && <span style={{ marginLeft: 12, fontSize: 28 }}>👑</span>}
                    </span>
                    <strong style={{ fontSize: 36 }}>{row.total} pts</strong>
                  </div>
                  {topWords.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontSize: 13,
                          opacity: 0.65,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        Top {topWords.length} word{topWords.length === 1 ? "" : "s"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {topWords.map((w) => (
                          <WordChip key={w.word} word={w} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <button
          onClick={() => send({ type: "playAgain" })}
          style={{ fontSize: 22, padding: "16px 32px", marginTop: 32 }}
        >
          Play again
        </button>
      </main>
    </>
  );
}

