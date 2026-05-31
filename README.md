# Nearby

A real-time, location-based social map. See what's happening around you and
connect with people nearby. Built with Expo (React Native) + TypeScript,
MapLibre + Stadia Maps, and Supabase.

> Working title — rename `name` in `app.json` anytime.

## Status — step 1 of the build

Implemented so far (the two foundation screens):

1. **Map screen** — dark MapLibre canvas (Stadia style) with a live location puck, a 5 km
   "neighborhood" radius ring, floating controls (layers · compose · recenter),
   a top-left **● N | Online** presence badge, and a gradient **+ Post Status**
   CTA (placeholder — wired up in a later step).
2. **Location gate** — on first launch the map is blurred and a bottom sheet
   asks to **Enable your location** (or *Set location manually*). After the user
   grants permission we flag their live position, fit the map to a 5 km radius,
   and surface everyone online within it.

## Tech stack

| Concern        | Choice                                     |
| -------------- | ------------------------------------------ |
| App            | Expo (React Native) + TypeScript, New Arch |
| Map            | MapLibre (`@maplibre/maplibre-react-native`) + Stadia Maps dark style |
| Location       | `expo-location` (foreground)               |
| Backend        | Supabase (Postgres + PostGIS + Auth)       |
| Identity       | Anonymous Supabase auth (no PII)           |
| UI accents     | Turquoise → light-green palette            |

## Project layout

```
App.tsx                      App shell: map + overlays + first-run gate
src/
  components/                MapScreen, OnlineBadge, MapControls,
                             PostStatusButton, LocationPermissionSheet
  hooks/                     useLocation (permission + watcher),
                             usePresence (heartbeat + nearby query)
  lib/                       config, supabase client, geo helpers
  services/identity.ts       anonymous device id
  theme/colors.ts            palette + brand gradient
supabase/migrations/         PostGIS schema, RLS, presence RPCs
```

## Setup

1. **Install**

   ```bash
   npm install
   npx expo install --fix   # run locally to align native module versions
   ```

2. **Configure env** — copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_STADIA_API_KEY` — free key (no card) from https://client.stadiamaps.com/
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   Until these are set, the map shows a placeholder and the online count
   stays at 1 (just you) — the UI still runs.

3. **Database** — apply the schema to your Supabase project:

   ```bash
   supabase db push        # or paste supabase/migrations/0001_init.sql
   ```

   Then enable **Anonymous sign-ins** in Supabase → Authentication → Providers.

4. **Native build** — `@maplibre/maplibre-react-native` needs a custom dev
   client (it does **not** run in Expo Go), but requires no extra tokens — the
   Expo config plugin in `app.json` handles the native setup. Then:

   ```bash
   npx expo run:ios       # or run:android, or eas build
   ```

## Security & privacy (built in from day one)

Live location is sensitive PII, so the data path is defensive by default:

- **Anonymous identity** — random UUID + Supabase anonymous auth. No email,
  phone, or name collected.
- **Row-Level Security** — a user can only read/write their *own* presence row.
  Raw locations are never directly queryable by other users.
- **Coarse exposure** — others are discovered only via the `nearby_online`
  function, which returns **snapped** coordinates (~110 m) and a hashed id,
  never the exact GPS fix.
- **Auto-expiry** — "online" means a heartbeat within 60 s; stale rows stop
  appearing and can be hard-deleted by a scheduled job.
- **Go invisible** — `go_invisible()` removes a user from others' views
  instantly (UI toggle plumbed, surfaced in a later step).
- **No secrets in the client** — only public tokens ship in the bundle; `.env`
  is git-ignored.

## Next steps

Status composer, friends/DMs, and the layers/compose actions are upcoming —
we're building piece by piece.
