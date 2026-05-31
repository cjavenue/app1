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

## Notes

- Uses the **same 4 Supabase migrations** as mobile — no DB changes.
- For Google sign-in on web, add your deployed origin to Supabase Auth → URL
  Configuration redirect allow-list.
