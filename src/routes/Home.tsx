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
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 56, margin: 0 }}>WordHive</h1>
      <p style={{ color: "var(--muted)", fontSize: 18 }}>
        A party word game. Host on a TV or laptop, players join from their phones.
      </p>
      <button
        onClick={() => nav(`/host/${generateRoomCode()}`)}
        style={{ fontSize: 22, padding: "16px 32px", marginTop: 24 }}
      >
        Host a new game
      </button>
    </main>
  );
}
