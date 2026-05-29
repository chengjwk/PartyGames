// Password gate, scoped to the HOST flow. The phone player flow
// (/play/*, which is what the QR code points at) walks through
// unguarded so guests don't need to know the password to scan + play.
// The SPA's static bundle is also public — without it the player
// phone couldn't actually load the page after scanning.
//
// Gated paths: /, /host/*, /flower-styles, /preview/*, /avatar-styles.html.
// Public paths: /play/*, /assets/*, /login, /api/login, common static
// file extensions (favicons, images, fonts).
//
// The shared password and signing secret come from Cloudflare Pages
// environment variables (SITE_PASSWORD + SITE_SECRET). See DEPLOY.md.
//
// Caveat: once the SPA bundle is loaded (which the player path makes
// public), client-side routing can in theory navigate to a host
// route without going through the middleware. That's a deliberate
// hack vs. a "casual barrier," which is all the password aims to
// be — the secret never ships in the bundle, so source inspection
// can't reveal it.

import {
  COOKIE_NAME,
  htmlEscape,
  readCookie,
  sanitizeNext,
  verifyToken,
  type PageEnv,
} from "./_lib";

// Decide whether a path bypasses the password gate.
function isPublicPath(pathname: string): boolean {
  // Login flow.
  if (pathname === "/login" || pathname === "/api/login") return true;
  // Player flow — QR-scanned URLs. Matches /play and anything beneath.
  if (pathname === "/play" || pathname.startsWith("/play/")) return true;
  // Vite-built SPA bundle. The browser fetches these once the SPA
  // entry HTML loads, so they have to be reachable on the player path.
  if (pathname.startsWith("/assets/")) return true;
  // Common static-asset extensions in public/ (favicons, images,
  // fonts). Deliberately excludes .html so /index.html and other
  // standalone HTML pages aren't trivially reachable without auth.
  if (/\.(svg|png|ico|jpe?g|gif|webp|woff2?|css|js|map)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export const onRequest: PagesFunction<PageEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);

  // Public paths always pass — login endpoints, player paths, SPA assets.
  if (isPublicPath(url.pathname)) {
    return ctx.next();
  }

  // If the secret isn't configured we'd rather fail closed than open.
  // This shouldn't happen in production (Pages env vars are set
  // before deploy) — log and lock everyone out so the operator
  // notices immediately.
  if (!ctx.env.SITE_PASSWORD || !ctx.env.SITE_SECRET) {
    return new Response(
      "Site is misconfigured — SITE_PASSWORD or SITE_SECRET is not set.",
      { status: 503, headers: { "content-type": "text/plain" } },
    );
  }

  const cookie = ctx.request.headers.get("cookie") ?? "";
  const token = readCookie(cookie, COOKIE_NAME);
  if (token && (await verifyToken(token, ctx.env.SITE_SECRET))) {
    return ctx.next();
  }

  // Serve the login HTML directly (rather than 302-redirecting to
  // /login) so we don't bounce the user's browser for first-load
  // navigations.
  const next = sanitizeNext(url.pathname + url.search);
  return loginPage({ next, errored: false });
};

// Inline login page — no external assets so the bundle doesn't have
// to load before the user authenticates. Style is intentionally
// minimal; matches the dark-friendly palette of the SPA.
export function loginPage({
  next,
  errored,
}: {
  next: string;
  errored: boolean;
}): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>Party Games — enter password</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f3efe4;
        --fg: #1a1a1f;
        --muted: #6b6b6b;
        --accent: #f5b400;
        --accent-fg: #1a1a1f;
        --border: rgba(0,0,0,0.15);
        --card: #ffffff;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0e1a14;
          --fg: #f4f1e0;
          --muted: #9aa39c;
          --accent: #f5b400;
          --accent-fg: #1a1a1f;
          --border: rgba(255,255,255,0.18);
          --card: #142420;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100dvh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        background:
          radial-gradient(ellipse at 70% 18%, rgba(245,180,0,0.18), transparent 60%),
          linear-gradient(180deg, var(--bg), var(--bg));
        color: var(--fg);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 28px 24px;
        width: 100%;
        max-width: 360px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.18);
        text-align: center;
      }
      h1 { margin: 0 0 4px; font-size: 28px; }
      p.subtitle { margin: 0 0 18px; color: var(--muted); font-size: 14px; }
      input[type="password"] {
        width: 100%;
        font-size: 20px;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--bg);
        color: var(--fg);
        letter-spacing: 4px;
        text-align: center;
      }
      button {
        margin-top: 12px;
        width: 100%;
        font-size: 18px;
        font-weight: 700;
        padding: 12px 16px;
        border: none;
        border-radius: 10px;
        background: var(--accent);
        color: var(--accent-fg);
        cursor: pointer;
      }
      .err {
        margin-top: 10px;
        color: #d24a52;
        font-size: 13px;
        min-height: 16px;
      }
      .flowers {
        margin: 0 auto 12px;
        font-size: 32px;
        line-height: 1;
        letter-spacing: 6px;
      }
    </style>
  </head>
  <body>
    <form class="card" method="POST" action="/api/login" autocomplete="off">
      <div class="flowers" aria-hidden="true">🌸 🌻 🪷</div>
      <h1>Party Games</h1>
      <p class="subtitle">Enter the password to continue.</p>
      <input
        type="password"
        name="password"
        autofocus
        required
        autocomplete="current-password"
        inputmode="text"
      />
      <input type="hidden" name="next" value="${htmlEscape(next)}" />
      <button type="submit">Enter</button>
      <div class="err">${errored ? "Wrong password — try again." : ""}</div>
    </form>
  </body>
</html>`;
  return new Response(html, {
    // Use 401 on the errored case so the browser doesn't cache the
    // failure HTML; otherwise 200 so a successful page render isn't
    // marked as an error in devtools.
    status: errored ? 401 : 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
