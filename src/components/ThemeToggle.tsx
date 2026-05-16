// Light/dark mode toggle button. Mounts wherever a top-bar action makes
// sense (home page, lobby phone, lobby TV). Multiple instances stay in
// sync via the theme module's CustomEvent broadcast.

import { useTheme } from "../lib/theme";

export default function ThemeToggle({
  size = 18,
  top = 12,
  // Sits to the LEFT of the FullscreenButton (which lives at right: 12).
  // The FS button's "⤢ fullscreen" / "⤡ exit" labels are wider than a
  // single icon, so we leave ~150px of clearance.
  right = 156,
}: {
  size?: number;
  top?: number;
  right?: number;
}) {
  const [theme, setTheme] = useTheme();
  const isLight = theme === "light";
  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      style={{
        position: "fixed",
        top,
        right,
        zIndex: 10,
        background: "var(--bg-elev)",
        color: "var(--fg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: size,
        opacity: 0.85,
        cursor: "pointer",
      }}
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}
