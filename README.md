# Nearby

A real-time, location-based social map. See what's happening around you and
connect with people nearby. Built with Expo (React Native) + TypeScript,
MapLibre + Stadia Maps, and Supabase.

> Working title — rename `name` in `app.json` anytime.

## Status

Implemented so far:

1. **Map screen** — dark MapLibre canvas (Stadia style) with a live location puck, a 5 km
   "neighborhood" radius ring, floating controls (layers · compose · recenter),
   a top-left **● N | Online** presence badge, and a gradient **+ Post Status**
   CTA (placeholder — wired up in a later step).
2. **Location gate** — on first launch the map is blurred and a bottom sheet
   asks to **Enable your location** (or *Set location manually*). After the user
   grants permission we flag their live position, fit the map to a 5 km radius,
   and surface everyone online within it.
3. **Bottom tab navigation** — Map · List · Statuses · Chats · Profile.
   Map, Statuses, and Profile are live; List and Chats are "coming soon" stubs.
4. **Ephemeral profiles** — see below.
5. **Statuses ("Post Status")** — a short (≤100 char) post in a category
   (Food/Sports/Walk/Games/Study/Travel/Other), pinned at your location and
   visible to people within 5 km. One active status per user (a new post
   replaces the old); each auto-expires after ~3h. Shown as map pins and in the
   Statuses feed. Reads go through the `nearby_statuses` RPC (coarse coords,
   no contact info).

## Profiles & identity lifecycle

- **Auto-create** — once location is shared, the user gets a profile with a
  random unique nickname (e.g. *"Lucky Heron 77"*), no signup.
- **Ephemeral by default** — an unverified profile (and its presence) is
  **hard-deleted 24h after creation** by `cleanup_expired_profiles()`
  (scheduled with `pg_cron`).
- **Email verification** makes it permanent — the anonymous user is upgraded to
  a permanent one and survives cleanup.
- **One-time rename** — the nickname can be changed exactly once; uniqueness
  (case-insensitive), length (4–20), charset, and a profanity blocklist are
  enforced **server-side** in `set_nickname()`.
- **Cross-device sign-in** — after verifying, the user can **link Google**
  (free) to sign in on another device later. **Apple sign-in** is deferred — it
  requires the Apple Developer Program ($99/yr) — and is shown as disabled.

## Tech stack

| Concern        | Choice                                     |
| -------------- | ------------------------------------------ |
| App            | Expo (React Native) + TypeScript, New Arch |
| Map            | MapLibre (`@maplibre/maplibre-react-native`) + Stadia Maps dark style |
| Navigation     | React Navigation (bottom tabs)             |
| Location       | `expo-location` (foreground)               |
| Backend        | Supabase (Postgres + PostGIS + Auth)       |
| Identity       | Anonymous Supabase auth → email-verified (no PII until verified) |
| UI accents     | Turquoise → light-green palette            |

## Project layout

```
App.tsx                      Root: navigation + provider + location gate
src/
  navigation/Tabs.tsx        Bottom tab bar (Map/List/Statuses/Chats/Profile)
  screens/                   MapTab, ProfileTab, PlaceholderTab
  components/                MapScreen, OnlineBadge, MapControls, PostStatusButton,
                             LocationPermissionSheet, EditNicknameModal, VerifyEmailModal
  context/AppContext.tsx     Shared location + presence + profile state
  hooks/                     useLocation, usePresence, useProfile
  lib/                       config, supabase client, geo helpers
  services/                  identity (device id), session (single anon session)
  theme/colors.ts            palette + brand gradient
supabase/migrations/         0001 presence (PostGIS, RLS) · 0002 profiles + 24h cleanup
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

3. **Database** — apply the migrations in order (SQL editor or
   `supabase db push`): `0001_init.sql`, `0002_profiles.sql`, `0003_statuses.sql`.
   Then:
   - Enable **Anonymous sign-ins** (Authentication → Providers).
   - Enable the **pg_cron** extension (Database → Extensions) and uncomment the
     `cron.schedule(...)` block at the bottom of `0002_profiles.sql` so
     unverified profiles are purged every 15 min.
   - For email verification in production, configure **custom SMTP**
     (Authentication → Email). Supabase's built-in mailer works for light dev use.
   - For **Google sign-in** (free): enable the Google provider (Authentication →
     Providers) with a Google Cloud OAuth client, add the redirect URL
     `nearby://auth-callback` to the allow-list (Authentication → URL
     Configuration), and turn on **Allow manual linking** (Authentication →
     Settings) so verified users can attach Google.

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
