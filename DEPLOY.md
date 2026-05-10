# Deploying WordHive

Two pieces:

- **PartyKit** — realtime game server (runs on Cloudflare Workers under the hood). Free tier.
- **Cloudflare Pages** — static React frontend. Free tier.

Both are first-time setup; subsequent deploys are one-liners.

---

## First-time setup

### 1. Deploy the PartyKit server

```bash
npm run deploy:party
```

First run opens a browser to authenticate with PartyKit (creates a free account if you don't have one). On success it prints a URL like:

```
https://wordhive.YOUR-USERNAME.partykit.dev
```

Copy the host part **without the protocol** — e.g. `wordhive.YOUR-USERNAME.partykit.dev`. You'll plug it into the frontend build below.

> If `deploy:party` fails with a bundle-size error, the dictionary data (`words.json`, `pangram-defs.json`) is too big for the Workers script limit. Tell Claude — easy fix is to fetch `words.json` at runtime from a static asset URL instead of bundling it.

### 2. Deploy the frontend to Cloudflare Pages

```bash
VITE_PARTY_HOST=wordhive.YOUR-USERNAME.partykit.dev npm run deploy:web
```

First run, `wrangler` will prompt to log into Cloudflare and create the Pages project. Subsequent deploys reuse the project.

You'll get a URL like:

```
https://wordhive.pages.dev
```

That's the URL phones and laptops visit. The build process bakes `VITE_PARTY_HOST` into the bundle, so the page knows to open a WebSocket to the PartyKit URL.

---

## Day-to-day deploys

After first-time setup:

```bash
# Server-only change (game logic, scoring, etc.)
npm run deploy:party

# Frontend-only change (UI, animations)
VITE_PARTY_HOST=wordhive.YOUR-USERNAME.partykit.dev npm run deploy:web

# Both
VITE_PARTY_HOST=wordhive.YOUR-USERNAME.partykit.dev npm run deploy
```

To avoid retyping the host: put it in a local `.env`:

```
# .env (gitignored)
VITE_PARTY_HOST=wordhive.YOUR-USERNAME.partykit.dev
```

Vite picks this up automatically; you can then run `npm run deploy:web` without the env prefix.

---

## Auto-deploy on git push (optional)

If you'd rather have GitHub auto-deploy:

1. Push the repo to GitHub.
2. Cloudflare Dashboard → **Pages** → **Create project** → **Connect to Git**.
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variable (Production): `VITE_PARTY_HOST = wordhive.YOUR-USERNAME.partykit.dev`
4. Every push to `main` triggers a deploy.

PartyKit doesn't have built-in GitHub integration — you still run `npm run deploy:party` manually after server changes.

---

## Custom domain (optional)

To use `wordhive.yourdomain.com`:

1. Add the domain to Cloudflare (DNS) if you haven't already.
2. Pages project → **Custom domains** → **Add**. Cloudflare auto-configures DNS.

For the PartyKit side (e.g. `party.yourdomain.com`), there's a CF Workers Routes setup that's a bit more involved — generally not worth the effort since the default `*.partykit.dev` URL works fine.

---

## What lives where

| | URL pattern | Free-tier limits |
|---|---|---|
| Static site | `https://<project>.pages.dev` | 500 builds/month, unlimited bandwidth |
| Realtime server | `wss://<name>.<user>.partykit.dev` | Sufficient for ~hundreds of concurrent users |

---

## Troubleshooting

**Phones can't connect after deploy.**
Check that `VITE_PARTY_HOST` was set during the build and matches your actual PartyKit URL. Open the deployed site in a browser, open DevTools → Console, and look for a failing `wss://` connection. The host in the URL should match `VITE_PARTY_HOST`.

**`crypto.randomUUID is not a function` on phones.**
Shouldn't happen on HTTPS, but if it does, it means `getClientId()` is somehow not finding the fallback. The fallback in `src/lib/clientId.ts` uses `crypto.getRandomValues` which works in all secure contexts.

**Definitions don't appear at round end.**
Check the PartyKit logs (`wrangler tail` or PartyKit dashboard). The Free Dictionary API can be flaky; missing definitions just don't render. Pre-cached pangram definitions in `party/data/pangram-defs.json` should always work.

**Round timer never fires.**
Cloudflare Durable Objects can hibernate when idle. With at least one open WebSocket the room stays alive. If you see this in production, switching from `setTimeout` to `room.storage.setAlarm()` makes the timer durable across hibernation. Tell Claude and they'll wire it up.
