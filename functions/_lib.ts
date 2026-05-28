// Shared helpers for the Cloudflare Pages Functions gate (see
// _middleware.ts + login.ts + api/login.ts). HMAC-signed token in an
// HttpOnly cookie — no full auth system, just enough to keep the site
// from being trivially public. Files prefixed with `_` aren't routed
// by Pages, so this module is importable but never directly hit.

export const COOKIE_NAME = "pg_auth";
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PageEnv {
  // The shared password users type in. Set via the Cloudflare Pages
  // dashboard → Settings → Environment variables (production +
  // preview). For local dev with `wrangler pages dev`, put it in
  // .dev.vars (gitignored).
  SITE_PASSWORD: string;
  // Random secret used to HMAC-sign the auth cookie. Anything long
  // and random; rotating it invalidates all existing sessions.
  SITE_SECRET: string;
}

// Read a single named cookie value out of a Cookie header string.
export function readCookie(header: string, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const k = trimmed.slice(0, eq);
    if (k === name) return trimmed.slice(eq + 1);
  }
  return null;
}

// Sign a fresh auth token. Payload is the absolute expiry timestamp
// in ms; signature is HMAC-SHA256(payload, secret). Encoded as
// `<expiry>.<hex>` — easy to verify and trivial to decode for
// debugging without leaking the secret.
export async function signToken(secret: string): Promise<string> {
  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiry);
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = await hmac(payload, secret);
  return safeEqual(sig, expected);
}

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const arr = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < arr.length; i++) {
    out += arr[i].toString(16).padStart(2, "0");
  }
  return out;
}

// Constant-time string compare so a network attacker can't time the
// HMAC verification. Marginal at HTTPS but cheap to keep correct.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    acc |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return acc === 0;
}

// Path-relative redirect target supplied by the login form. Restrict
// to same-origin paths so a tampered `next` can't bounce the user
// off-site after auth.
export function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw.slice(0, 500);
}

// HTML-escape user-controlled text we splice into the login template.
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
