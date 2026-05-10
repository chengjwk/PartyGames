// Stable per-browser id stored in localStorage so a player keeps the same
// identity (and score) across reconnects/reloads.

const KEY = "wordhive.clientId";

export function getClientId(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem(KEY);
  } catch {
    // Safari private mode etc — fall through to a per-tab id.
  }
  if (!id) {
    id = randomId();
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // ignore
    }
  }
  return id;
}

// crypto.randomUUID() requires a secure context (HTTPS or localhost).
// Phones loading http://<LAN-IP>:5173 in dev are NOT secure contexts, so we
// build our own id from getRandomValues with a Math.random fallback.
function randomId(): string {
  try {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    );
  }
}
