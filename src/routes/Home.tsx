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
  const startWord = () => nav(`/host/word/${generateRoomCode()}`);
  const startMath = () => nav(`/host/math/${generateRoomCode()}`);
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 56, margin: 0 }}>Party Games</h1>
      <p style={{ color: "var(--muted)", fontSize: 18, marginTop: 8 }}>
        Pick a game. Phones join via QR code.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginTop: 40,
        }}
      >
        <GameCard
          title="WordHive"
          emoji="🐝"
          accent="#f5b400"
          description="Make as many words as you can from the honeycomb. Bees swoop in with bonus letters."
          onClick={startWord}
        />
        <GameCard
          title="MathHive"
          emoji="🧮"
          accent="#6aa6ff"
          description="Build equations from the digit hive. The center digit is required in every answer."
          onClick={startMath}
        />
      </div>
    </main>
  );
}

function GameCard({
  title,
  emoji,
  accent,
  description,
  onClick,
}: {
  title: string;
  emoji: string;
  accent: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg-elev)",
        border: `2px solid ${accent}`,
        borderRadius: 16,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        color: "var(--fg)",
      }}
    >
      <div style={{ fontSize: 64, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent }}>{title}</div>
      <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.4 }}>
        {description}
      </div>
      <div
        style={{
          marginTop: 8,
          padding: "10px 24px",
          borderRadius: 8,
          background: accent,
          color: "var(--bg)",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        Host a new game
      </div>
    </button>
  );
}
