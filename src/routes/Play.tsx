import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useRoomSocket, type SubmitFeedback } from "../lib/useRoomSocket";
import { getClientId } from "../lib/clientId";
import { sounds } from "../lib/sounds";
import { randomName } from "../lib/randomName";
import { AVATARS, randomAvatar } from "../lib/avatars";
import Honeycomb from "../components/Honeycomb";
import Timer from "../components/Timer";
import PausedOverlay from "../components/PausedOverlay";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import GameMenu from "../components/GameMenu";
import Fireworks from "../components/Fireworks";
import Avatar from "../components/Avatar";
import type {
  Player,
  PrivatePlayerState,
  PublicGameState,
  RoundConfig,
  RoundSummary,
  ScoredWord,
} from "../shared/types";

const NAME_KEY = "wordhive.name";
const AVATAR_KEY = "wordhive.avatar";

export default function Play() {
  const { room } = useParams<{ room: string }>();
  const roomCode = (room ?? "").toUpperCase();
  const { state, privateState, lastSubmit, send } = useRoomSocket(roomCode, "player");
  const [clientId] = useState(getClientId);
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY) ?? randomName(),
  );
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem(AVATAR_KEY) ?? randomAvatar(),
  );
  const [joined, setJoined] = useState(false);
  const autoJoinedRef = useRef(false);

  const join = (asName: string, asAvatar: string) => {
    const trimmed = asName.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    localStorage.setItem(AVATAR_KEY, asAvatar);
    send({ type: "join", name: trimmed, avatar: asAvatar, clientId });
    setJoined(true);
  };

  useEffect(() => {
    if (autoJoinedRef.current || joined) return;
    if (!state) return;
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
        <FullPage>Connecting...</FullPage>
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
        <PlayerLobby
          state={state}
          roomCode={roomCode}
          isHost={isHost}
          clientId={clientId}
          send={send}
        />
      );
      break;
    case "ROUND_STARTING":
      view = <RoundStartingScreen state={state} />;
      break;
    case "ROUND_PLAYING":
      view = (
        <PlayerRound
          state={state}
          privateState={privateState}
          lastSubmit={lastSubmit}
          send={send}
        />
      );
      break;
    case "ROUND_RESULTS":
      view = (
        <PlayerRoundResults
          state={state}
          privateState={privateState}
          clientId={clientId}
          isHost={isHost}
          send={send}
        />
      );
      break;
    case "FINAL_RESULTS":
      view = <PlayerFinal state={state} clientId={clientId} isHost={isHost} send={send} />;
      break;
  }

  const disconnected = state.players.filter((p) => !p.connected);
  return (
    <>
      <GardenBackground />
      <FullscreenButton />
      <GameMenu state={state} send={send} />
      {view}
      {state.paused && (
        <PausedOverlay
          roomCode={roomCode}
          disconnected={disconnected}
          showQR={false}
          onResume={() => send({ type: "togglePause" })}
        />
      )}
    </>
  );
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        color: "var(--muted)",
        fontSize: 20,
      }}
    >
      {children}
    </main>
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
      <h1 style={{ margin: 0, color: "var(--accent)" }}>WordHive</h1>
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
          inputMode="text"
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
          title="New random name"
          style={{
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DiceIcon />
        </button>
      </div>
      <div>
        <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 8 }}>Pick an avatar</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              aria-label={`Avatar ${a}`}
              style={{
                background: "transparent",
                padding: 4,
                aspectRatio: "1 / 1",
                borderRadius: 12,
                border:
                  a === avatar ? "3px solid var(--accent)" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
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

function PlayerLobby({
  state,
  roomCode,
  isHost,
  clientId,
  send,
}: {
  state: PublicGameState;
  roomCode: string;
  isHost: boolean;
  clientId: string;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
  const cfg = state.config;
  const setCfg = (patch: Partial<RoundConfig>) => send({ type: "configure", config: patch });
  const [editing, setEditing] = useState(false);
  const me = state.players.find((p) => p.id === clientId);
  return (
    <main style={{ padding: "60px 20px 24px" }}>
      <h1 style={{ margin: 0, color: "var(--accent)" }}>WordHive</h1>
      <p style={{ color: "var(--muted)" }}>Room {roomCode}</p>

      <h2 style={{ fontSize: 22, marginBottom: 8 }}>
        Players <span style={{ color: "var(--muted)" }}>({state.players.length})</span>
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {state.players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            isHost={state.hostPlayerId === p.id}
            isMe={p.id === clientId}
            multiplierVisible
            onMultiplierChange={
              isHost
                ? (m) => send({ type: "setHandicap", playerId: p.id, multiplier: m })
                : undefined
            }
            onEdit={p.id === clientId ? () => setEditing(true) : undefined}
          />
        ))}
      </ul>

      {editing && me && (
        <EditProfile
          initialName={me.name}
          initialAvatar={me.avatar}
          onCancel={() => setEditing(false)}
          onSave={(newName, newAvatar) => {
            if (newName !== me.name) send({ type: "rename", name: newName });
            if (newAvatar !== me.avatar) send({ type: "setAvatar", avatar: newAvatar });
            localStorage.setItem(NAME_KEY, newName);
            localStorage.setItem(AVATAR_KEY, newAvatar);
            setEditing(false);
          }}
        />
      )}

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
          </section>
          <button
            onClick={() => send({ type: "startGame" })}
            disabled={state.players.length === 0}
            style={{ fontSize: 22, padding: 16, marginTop: 16, width: "100%" }}
          >
            Start Game
          </button>
        </>
      ) : (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>
          Waiting for{" "}
          <strong style={{ color: "var(--fg)" }}>
            {state.players.find((p) => p.id === state.hostPlayerId)?.name ?? "host"}
          </strong>{" "}
          to start...
        </p>
      )}
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
        -
      </button>
      <span style={{ minWidth: 48, textAlign: "center", fontWeight: 700 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} style={{ padding: "4px 12px" }}>
        +
      </button>
    </div>
  );
}

function PlayerRow({
  player,
  isHost,
  isMe,
  multiplierVisible,
  onMultiplierChange,
  onEdit,
}: {
  player: Player;
  isHost: boolean;
  isMe: boolean;
  multiplierVisible?: boolean;
  onMultiplierChange?: (m: number) => void;
  onEdit?: () => void;
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
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {player.name}
        {isMe && <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: 13 }}>(you)</span>}
        {isHost && (
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
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Edit name and avatar"
          title="Edit"
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "4px 8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PencilIcon />
        </button>
      )}
      {multiplierVisible &&
        (onMultiplierChange ? (
          <select
            value={player.scoreMultiplier}
            onChange={(e) => onMultiplierChange(Number(e.target.value))}
            style={{
              background: "var(--bg)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 6px",
              fontSize: 14,
            }}
          >
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        ) : (
          player.scoreMultiplier !== 1 && (
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{player.scoreMultiplier}x</span>
          )
        ))}
    </li>
  );
}

function RoundStartingScreen({ state }: { state: PublicGameState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(i);
  }, []);
  if (!state.roundStartsAt) return <FullPage>Get ready...</FullPage>;
  const remaining = Math.max(0, Math.ceil((state.roundStartsAt - now) / 1000));
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ color: "var(--muted)", fontSize: 18, margin: 0 }}>
          Round {state.currentRound} of {state.config.totalRounds}
        </p>
        <div style={{ fontSize: 200, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
          {remaining || "GO"}
        </div>
      </div>
    </main>
  );
}

function PlayerRound({
  state,
  privateState,
  lastSubmit,
  send,
}: {
  state: PublicGameState;
  privateState: PrivatePlayerState | null;
  lastSubmit: SubmitFeedback | null;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
  const puzzle = state.puzzle;
  const [draft, setDraft] = useState("");
  const [order, setOrder] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [popups, setPopups] = useState<Array<{ id: number; text: string; pangram: boolean }>>([]);
  const [muted, setMuted] = useState(() => sounds.isMuted());
  const popupIdRef = useRef(0);

  useEffect(() => {
    if (!lastSubmit) return;
    if (lastSubmit.ok) {
      if (lastSubmit.isPangram) sounds.pangram();
      else sounds.good();
      const tag = `+${lastSubmit.points}${lastSubmit.isPangram ? " PANGRAM" : ""}${lastSubmit.firstFinder ? " 1st!" : ""}`;
      const id = ++popupIdRef.current;
      setPopups((prev) => [...prev, { id, text: tag, pangram: !!lastSubmit.isPangram }]);
      setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 1100);
      setFeedback({ msg: tag, ok: true });
      setDraft("");
    } else {
      sounds.bad();
      setFeedback({ msg: reasonText(lastSubmit.reason), ok: false });
      setShakeKey((n) => n + 1);
      setDraft(""); // clear so the player can keep typing without backspacing
    }
    const t = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(t);
  }, [lastSubmit]);

  if (!puzzle || !state.roundEndsAt) return <FullPage>Loading round...</FullPage>;

  const center = puzzle.letters[0];
  const orderedOuter = order.map((i) => puzzle.letters[i]);
  const displayLetters = [center, ...orderedOuter];

  const tap = (l: string) => {
    if (draft.length >= 24) return;
    setDraft((d) => d + l);
  };
  const backspace = () => setDraft((d) => d.slice(0, -1));
  const submit = () => {
    if (!draft.trim()) return;
    send({ type: "submitWord", word: draft });
  };
  const shuffle = () => setOrder((o) => shuffleArray(o));
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sounds.setMuted(next);
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "56px 16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
      }}
    >
      <style>{`
        @keyframes wh-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        @keyframes wh-pop { 0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); } 15% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -80px) scale(1); } }
      `}</style>
      <header style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          R{state.currentRound}/{state.config.totalRounds}
        </span>
        <Timer endsAt={state.roundEndsAt} size={28} />
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            style={{ background: "transparent", color: "var(--muted)", padding: "4px 8px", fontSize: 14 }}
          >
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
          position: "relative",
          fontSize: 36,
          fontWeight: 800,
          minHeight: 56,
          letterSpacing: 4,
          textTransform: "uppercase",
          textAlign: "center",
          color: feedback ? (feedback.ok ? "#7fd97f" : "#ff8c8c") : "var(--fg)",
          transition: "color 120ms",
          animation:
            shakeKey > 0 && feedback && !feedback.ok ? "wh-shake 0.35s ease-out" : undefined,
          width: "100%",
        }}
      >
        {feedback ? feedback.msg : draft || " "}
        {popups.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translate(-50%, 0)",
              fontSize: p.pangram ? 28 : 22,
              fontWeight: 800,
              color: p.pangram ? "var(--accent)" : "#7fd97f",
              pointerEvents: "none",
              animation: "wh-pop 1.1s ease-out forwards",
              whiteSpace: "nowrap",
            }}
          >
            {p.text}
          </span>
        ))}
      </div>

      <Honeycomb
        letters={displayLetters}
        onTap={tap}
        size={Math.min(window.innerWidth - 32, 380)}
        bonusLetter={puzzle.bonusLetter}
        bees={state.bees}
      />

      <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "stretch" }}>
        <button
          onClick={backspace}
          disabled={!draft}
          style={{
            flex: 1,
            fontSize: 16,
            padding: "20px 0",
            background: "var(--bg-elev)",
            color: "var(--fg)",
          }}
        >
          Delete
        </button>
        <button
          onClick={shuffle}
          aria-label="Shuffle outer letters"
          title="Shuffle"
          style={{
            width: 64,
            padding: 0,
            background: "var(--bg-elev)",
            color: "var(--fg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShuffleIcon />
        </button>
        <button
          onClick={submit}
          disabled={!draft}
          style={{
            flex: 2,
            fontSize: 26,
            fontWeight: 800,
            padding: "20px 0",
            letterSpacing: 3,
          }}
        >
          ENTER
        </button>
      </div>

      <FoundList found={privateState?.foundWords ?? []} />
    </main>
  );
}

function FoundList({ found }: { found: ScoredWord[] }) {
  if (found.length === 0) {
    return (
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        No words yet. Tap letters above and press Enter.
      </p>
    );
  }
  return (
    <div style={{ width: "100%", marginTop: 12 }}>
      <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 6 }}>
        Found ({found.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[...found].reverse().map((w) => (
          <span
            key={w.word}
            style={{
              background: w.isPangram ? "var(--accent)" : "var(--bg-elev)",
              color: w.isPangram ? "var(--accent-fg)" : "var(--fg)",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 14,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {w.word}
            <span style={{ opacity: 0.7, fontSize: 11, marginLeft: 4 }}>+{w.points}</span>
            {w.firstFinder && <span style={{ marginLeft: 3 }}>★</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlayerRoundResults({
  state,
  privateState,
  clientId,
  isHost,
  send,
}: {
  state: PublicGameState;
  privateState: PrivatePlayerState | null;
  clientId: string;
  isHost: boolean;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
  const isFinal = state.currentRound >= state.config.totalRounds;
  return (
    <main style={{ padding: "60px 20px 24px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Round {state.currentRound} results</h1>
        {isHost ? (
          <button
            onClick={() => send({ type: "nextRound" })}
            style={{ fontSize: 16, padding: "10px 16px", whiteSpace: "nowrap" }}
          >
            {isFinal ? "Show final →" : "Next round →"}
          </button>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Waiting for host…</span>
        )}
      </header>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        You scored <strong style={{ color: "var(--fg)" }}>{privateState?.scoreThisRound ?? 0}</strong> this round.
      </p>
      <FoundList found={privateState?.foundWords ?? []} />
      {state.roundSummary && state.roundSummary.pangrams.length > 0 && (
        <PangramList summary={state.roundSummary} />
      )}
      <Standings state={state} clientId={clientId} title="Total" />
    </main>
  );
}

function PangramList({ summary }: { summary: RoundSummary }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 20 }}>Pangrams</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {summary.pangrams.map((w) => (
          <div
            key={w}
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              padding: "8px 12px",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 18 }}>{w}</div>
            {summary.definitions[w] && (
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                {summary.definitions[w]}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Standings({
  state,
  clientId,
  title,
}: {
  state: PublicGameState;
  clientId: string;
  title: string;
}) {
  const ranked = [...state.players]
    .map((p) => ({ player: p, total: state.totalScores[p.id] ?? 0 }))
    .sort((a, b) => b.total - a.total);
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 20 }}>{title}</h2>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {ranked.map((r, i) => {
          const isMe = r.player.id === clientId;
          return (
            <li
              key={r.player.id}
              style={{
                background: isMe ? "var(--accent)" : "var(--bg-elev)",
                color: isMe ? "var(--accent-fg)" : "var(--fg)",
                padding: "10px 14px",
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
    </section>
  );
}

function PlayerFinal({
  state,
  clientId,
  isHost,
  send,
}: {
  state: PublicGameState;
  clientId: string;
  isHost: boolean;
  send: ReturnType<typeof useRoomSocket>["send"];
}) {
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
      <main style={{ padding: "60px 20px 24px" }}>
        <h1 style={{ marginTop: 0 }}>Final Results</h1>
        <BestWordsRowMobile
          longest={state.gameStats.longest}
          longestPlayer={longestPlayer}
          highest={state.gameStats.highest}
          highestPlayer={highestPlayer}
          clientId={clientId}
        />
        <Standings state={state} clientId={clientId} title="Final standings" />
        {isHost ? (
          <button
            onClick={() => send({ type: "playAgain" })}
            style={{ fontSize: 20, padding: 16, width: "100%", marginTop: 16 }}
          >
            Play again
          </button>
        ) : (
          <p style={{ color: "var(--muted)", marginTop: 16 }}>Waiting for host...</p>
        )}
      </main>
    </>
  );
}

function BestWordsRowMobile({
  longest,
  longestPlayer,
  highest,
  highestPlayer,
  clientId,
}: {
  longest: { word: string; playerId: string } | null;
  longestPlayer: { name: string; avatar: string } | null | undefined;
  highest: { word: string; points: number; playerId: string } | null;
  highestPlayer: { name: string; avatar: string } | null | undefined;
  clientId: string;
}) {
  if (!longest && !highest) return null;
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 8, marginBottom: 16 }}>
      {longest && longestPlayer && (
        <BestCardMobile
          title="Longest word"
          word={longest.word}
          subtitle={`${longest.word.length} letters`}
          player={longestPlayer}
          isMe={longest.playerId === clientId}
        />
      )}
      {highest && highestPlayer && (
        <BestCardMobile
          title="Highest scoring"
          word={highest.word}
          subtitle={`${highest.points} pts`}
          player={highestPlayer}
          isMe={highest.playerId === clientId}
        />
      )}
    </div>
  );
}

function BestCardMobile({
  title,
  word,
  subtitle,
  player,
  isMe,
}: {
  title: string;
  word: string;
  subtitle: string;
  player: { name: string; avatar: string };
  isMe: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: isMe ? "2px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          color: "var(--accent)",
          marginTop: 2,
        }}
      >
        {word}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 14 }}>
        <Avatar id={player.avatar} size={28} />
        <span>
          {player.name}
          {isMe && <span style={{ marginLeft: 4, color: "var(--muted)" }}>(you)</span>}
        </span>
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{subtitle}</span>
      </div>
    </div>
  );
}

function reasonText(reason: string | undefined): string {
  switch (reason) {
    case "too_short":
      return "Too short";
    case "missing_center":
      return "Missing center letter";
    case "invalid_letter":
      return "Bad letter";
    case "not_a_word":
      return "Not a word";
    case "already_found":
      return "Already found";
    case "not_in_round":
      return "Round not active";
    default:
      return "Invalid";
  }
}

function DiceIcon() {
  // Simple die face — square with three dots arranged diagonally.
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 4.5l5 5L8 21H3v-5L14.5 4.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 6l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditProfile({
  initialName,
  initialAvatar,
  onCancel,
  onSave,
}: {
  initialName: string;
  initialAvatar: string;
  onCancel: () => void;
  onSave: (name: string, avatar: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, avatar);
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 20, 0.85)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 20px",
        overflowY: "auto",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 18,
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Edit profile</h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--bg-elev)",
            borderRadius: 10,
          }}
        >
          <Avatar id={avatar} size={56} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{ fontSize: 20, padding: 10, flex: 1, minWidth: 0 }}
          />
          <button
            onClick={() => setName(randomName())}
            aria-label="Random name"
            title="New random name"
            style={{
              background: "var(--bg)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DiceIcon />
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              aria-label={`Avatar ${a}`}
              style={{
                background: "transparent",
                padding: 4,
                aspectRatio: "1 / 1",
                borderRadius: 12,
                border:
                  a === avatar ? "3px solid var(--accent)" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
              }}
            >
              <Avatar id={a} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              fontSize: 16,
              padding: 14,
              background: "var(--bg-elev)",
              color: "var(--fg)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            style={{ flex: 2, fontSize: 16, padding: 14 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ShuffleIcon() {
  // Lucide-style "shuffle" — two crossing arrows ending on the right.
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 18h1.6c1.4 0 2.7-.7 3.5-1.8l5.8-8.4c.8-1.1 2.1-1.8 3.5-1.8H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.7 3.7 1.9l.6.9" />
      <path d="M22 18h-5.9c-1.4 0-2.7-.7-3.5-1.8l-.6-.9" />
      <path d="m18 14 4 4-4 4" />
    </svg>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
