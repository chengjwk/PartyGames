import { useNavigate } from "react-router-dom";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // skip I and O for legibility

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

export default function Home() {
  const nav = useNavigate();
  const start = () => nav(`/host/${generateRoomCode()}`);
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 56, margin: 0 }}>Party Games</h1>
      <p style={{ color: "var(--muted)", fontSize: 18, marginTop: 8 }}>
        Word and math party games. Phones join via QR code; the host player picks
        the game.
      </p>
      <button
        onClick={start}
        style={{ fontSize: 22, padding: "16px 32px", marginTop: 32 }}
      >
        Host a new game
      </button>
      <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 32 }}>
        <GameSummary emoji="🐝" name="WordHive" accent="#f5b400" />
        <GameSummary emoji="🧮" name="MathHive" accent="#6aa6ff" />
      </div>
    </main>
  );
}

function GameSummary({ emoji, name, accent }: { emoji: string; name: string; accent: string }) {
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: `1px solid ${accent}`,
        borderRadius: 12,
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 32 }}>{emoji}</span>
      <span style={{ fontWeight: 700, color: accent }}>{name}</span>
    </div>
  );
}
