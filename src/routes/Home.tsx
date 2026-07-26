import { useState } from "react";
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
  const [noTv, setNoTv] = useState(false);
  // With a TV, this device is the shared display and joins no game. Without
  // one, it goes down the player route instead — the first phone in becomes
  // host, so it gets the game picker and the round controls while still
  // playing along.
  const start = () => {
    const code = generateRoomCode();
    nav(noTv ? `/play/${code}` : `/host/${code}`);
  };
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
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 20,
            color: "var(--muted)",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={noTv}
            onChange={(e) => setNoTv(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          No TV — play and host on this phone
        </label>
      </main>
    </>
  );
}
