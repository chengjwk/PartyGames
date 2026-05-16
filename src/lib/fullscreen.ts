// Auto-enter fullscreen on a player phone after they tap Join.
//
// Browsers reject fullscreen requests outside of a user-gesture handler,
// so this MUST be called synchronously from an onClick / onTouchEnd
// (not inside an async chain or a useEffect). Desktop users get a pass
// — auto-fullscreen is jarring on a big screen and they can still toggle
// it manually via the FullscreenButton.

export function requestFullscreenIfMobile(): void {
  if (typeof document === "undefined") return;
  // Touch device or narrow window? Treat as mobile.
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ||
    (typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches);
  if (!isMobile) return;
  const el = document.documentElement;
  // iOS Safari doesn't expose requestFullscreen on arbitrary elements,
  // so this silently no-ops there — that's fine, our PWA-style UI is
  // already designed to look good in the regular Safari viewport.
  if (typeof el.requestFullscreen !== "function") return;
  if (document.fullscreenElement) return;
  el.requestFullscreen().catch(() => {
    // Ignore — request rejected (e.g., wrong gesture context).
  });
}
