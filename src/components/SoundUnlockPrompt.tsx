import { useEffect, useState } from "react";
import { sounds } from "../lib/sounds";

// Floating "Click to enable sound" banner for the host TV. The browser blocks
// AudioContext until a user gesture on this tab, and the host commonly never
// touches the TV (they drive the game from their phone). This gives them a
// visible affordance to unlock audio once when the room is first set up.
export default function SoundUnlockPrompt() {
  const [unlocked, setUnlocked] = useState(() => sounds.audioState() === "running");

  useEffect(() => {
    if (unlocked) return;
    // Cheap poll — incidental clicks elsewhere (fullscreen, Start Game) also
    // unlock the context via the module-level listener; we just want to learn
    // when that has happened so we can hide the banner.
    const id = setInterval(() => {
      if (sounds.audioState() === "running") {
        setUnlocked(true);
      }
    }, 400);
    return () => clearInterval(id);
  }, [unlocked]);

  if (unlocked) return null;

  return (
    <button
      onClick={async () => {
        const ok = await sounds.tryUnlock();
        if (ok) {
          setUnlocked(true);
          // Brief audible confirmation so the host knows it worked.
          sounds.tick();
        }
      }}
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        background: "var(--accent)",
        color: "var(--accent-fg)",
        border: "none",
        borderRadius: 10,
        padding: "10px 18px",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <SpeakerIcon />
      Click to enable sound
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}
