# Nearby — Web (PWA)

An installable Progressive Web App version of the Nearby mobile app, sharing the
**same Supabase backend**. Built with Vite + React + TypeScript, **MapLibre GL JS**
(Stadia dark style — free, no credit card), and `vite-plugin-pwa`.

> This lives alongside the Expo mobile app in the same repo (`/` = mobile, `/web` = this PWA).
> The backend (Supabase schema/RPCs) is shared; only the UI + map layer are web-specific.

## What's here

- **Map** — dark MapLibre GL JS canvas, your location, 5 km ring, online count,
  status pins, "+ Post Status".
- **List** — card deck of nearby statuses (skip / ask-to-join).
- **Statuses** — feed + incoming join requests (accept/decline).
- **Profile** — random name, one-time rename, email verification, Google sign-in,
  Meetups, and an **Add to Home Screen** install card.
- **Chats** — stub (as on mobile).

## Run

```bash
cd web
cp .env.example .env     # fill in Stadia + Supabase keys (same as mobile)
npm install
npm run dev              # http://localhost:5173
```

Geolocation needs **HTTPS or localhost** — `npm run dev` on localhost is fine.

## Build / preview / install

```bash
npm run build            # outputs dist/ with service worker + manifest
npm run preview          # serve the production build locally
```

To **install on iPhone**: open the deployed URL in Safari → Share →
**Add to Home Screen**. (Android Chrome shows an install prompt automatically.)

## Env

`VITE_STADIA_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(optionally `VITE_MAP_STYLE`). These are public client keys — RLS protects data.

## Deploy (get it onto your iPhone)

Both configs are committed. **Either** host works — pick one, connect this GitHub
repo, and **set the environment variables** in the host dashboard (because `.env`
is git-ignored and never pushed):

```
VITE_STADIA_API_KEY   = <your Stadia key>
VITE_SUPABASE_URL     = <your Supabase URL>
VITE_SUPABASE_ANON_KEY= <your Supabase publishable key>
```

### Netlify (zero dashboard config — uses `netlify.toml` at the repo root)
1. New site → import this repo, branch `claude/mobile-app-creation-QBSMB`.
2. Build settings auto-fill from `netlify.toml` (base `web`, publish `dist`).
3. Add the 3 env vars above → Deploy.

### Vercel (uses `web/vercel.json`)
1. New Project → import this repo.
2. **Set "Root Directory" to `web`** (important — the app is in a subfolder).
3. Add the 3 env vars above → Deploy.

Then on your iPhone: open the deployed `https://…` URL in **Safari → Share →
Add to Home Screen**. It launches full-screen like a native app.

> Tip: a quick no-git option is `npm run build` then drag the `web/dist` folder
> onto Netlify Drop (app.netlify.com/drop) — but you'd bake the env vars in at
> build time locally first.

## Notes

- Uses the **same 4 Supabase migrations** as mobile — no DB changes.
- For Google sign-in on web, add your deployed origin to Supabase Auth → URL
  Configuration redirect allow-list.
