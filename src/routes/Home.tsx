import { useNavigate } from "react-router-dom";
import GardenBackground from "../components/GardenBackground";
import FullscreenButton from "../components/FullscreenButton";
import ThemeToggle from "../components/ThemeToggle";

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
    <>
      <GardenBackground variant="lush" />
      <FullscreenButton />
      <ThemeToggle />
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
          A garden of party games. Phones join via QR code; the host picks the
          game from the lobby.
        </p>
        <button
          onClick={start}
          style={{ fontSize: 22, padding: "16px 32px", marginTop: 32 }}
        >
          Host a new game
        </button>
      </main>
    </>
  );
}
