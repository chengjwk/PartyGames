import { useEffect, useState } from "react";

// Toggles full-screen on the document root. Must be triggered by a user gesture
// (browsers reject auto-fullscreen). On iOS Safari this silently no-ops since
// the API isn't supported there for arbitrary elements.

export default function FullscreenButton({
  size = 18,
}: {
  size?: number;
}) {
  const [isFs, setIsFs] = useState(typeof document !== "undefined" && !!document.fullscreenElement);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof document.documentElement.requestFullscreen === "function");
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFs ? "Exit fullscreen" : "Fullscreen"}
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 10,
        background: "var(--bg-elev)",
        color: "var(--fg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: size,
        opacity: 0.7,
        cursor: "pointer",
      }}
    >
      {isFs ? "⤡ exit" : "⤢ fullscreen"}
    </button>
  );
}
