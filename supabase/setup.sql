-- Nearby — complete database setup (migrations 0001–0004 combined).
-- Paste ALL of this into the Supabase SQL Editor and click Run.
-- Safe to re-run (idempotent).


-- ============================================================
-- migrations/0001_init.sql
-- ============================================================

-- Nearby — presence schema
-- Run with: supabase db push  (or paste into the Supabase SQL editor)
--
-- Security model
-- --------------
--  * Identity is an anonymous Supabase auth user (auth.uid()).
--  * The presence table is NEVER selectable by other users — RLS only lets a
--    user read/write their OWN row. Nobody can query raw locations of others.
--  * Other users are discovered ONLY through the `nearby_online` function,
--    which is SECURITY DEFINER and returns COARSE (snapped) coordinates plus a
--    rotating-safe id — never the exact GPS fix.
--  * "Online" = a heartbeat within the last 60 seconds. Stale rows simply stop
--    appearing; a scheduled job can hard-delete them.

create extension if not exists postgis;

create table if not exists public.presence (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  device_id   text not null,
  location    geography(Point, 4326) not null,
  visible     boolean not null default true,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists presence_location_gix on public.presence using gist (location);
create index if not exists presence_last_seen_idx on public.presence (last_seen);

alter table public.presence enable row level security;

-- Each user may only touch their own presence row.
drop policy if exists "own presence select" on public.presence;
create policy "own presence select" on public.presence
  for select using (auth.uid() = user_id);

drop policy if exists "own presence upsert" on public.presence;
create policy "own presence upsert" on public.presence
  for insert with check (auth.uid() = user_id);

drop policy if exists "own presence update" on public.presence;
create policy "own presence update" on public.presence
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own presence delete" on public.presence;
create policy "own presence delete" on public.presence
  for delete using (auth.uid() = user_id);

-- Upsert my heartbeat. Caller must be authenticated.
create or replace function public.upsert_presence(p_device_id text, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.presence (user_id, device_id, location, visible, last_seen)
  values (
    auth.uid(),
    p_device_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    true,
    now()
  )
  on conflict (user_id) do update
    set location  = excluded.location,
        device_id = excluded.device_id,
        visible   = true,
        last_seen = now();
end;
$$;

-- Flip myself invisible (stops appearing to others immediately).
create or replace function public.go_invisible()
returns void
language plpgsql
security invoker
as $$
begin
  update public.presence set visible = false, last_seen = now()
  where user_id = auth.uid();
end;
$$;

-- Who else is online within p_radius_m of me?
-- SECURITY DEFINER so it can read across rows, but it deliberately returns only
-- COARSE coordinates (rounded to ~3 decimals, ~110m) and excludes the caller.
create or replace function public.nearby_online(p_lat double precision, p_lng double precision, p_radius_m double precision)
returns table (id text, lat double precision, lng double precision, distance_m double precision)
language sql
security definer
set search_path = public
as $$
  select
    md5(p.user_id::text) as id,
    round(ST_Y(p.location::geometry)::numeric, 3)::double precision as lat,
    round(ST_X(p.location::geometry)::numeric, 3)::double precision as lng,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.presence p
  where p.visible
    and p.last_seen > now() - interval '60 seconds'
    and p.user_id <> auth.uid()
    and ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    );
$$;

grant execute on function public.upsert_presence(text, double precision, double precision) to authenticated;
grant execute on function public.go_invisible() to authenticated;
grant execute on function public.nearby_online(double precision, double precision, double precision) to authenticated;


-- ============================================================
-- migrations/0002_profiles.sql
-- ============================================================

-- Nearby — profiles, ephemeral identity & 24h cleanup
-- Run AFTER 0001_init.sql.
--
-- Lifecycle
-- ---------
--  * On first location share the app calls create_profile(), which assigns a
--    random unique nickname (e.g. "Lucky Heron 77") to the anonymous user.
--  * A profile is EPHEMERAL until the user verifies their email. Unverified
--    anonymous users (and their profile + presence) are hard-deleted 24h after
--    creation by cleanup_expired_profiles() (scheduled via pg_cron).
--  * Verifying email turns the anonymous user into a permanent one
--    (email_confirmed_at set, is_anonymous = false) so it survives cleanup and
--    can later link Google/Apple identities.
--
-- Security
--  * RLS: a user can only read/update their OWN profile row.
--  * Contact details (email/phone) live in auth.users, never in profiles, and
--    are never exposed through nearby_online.

create table if not exists public.profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  nickname         text not null,
  nickname_changed boolean not null default false,
  gender           text,
  interests        text[] not null default '{}',
  meetups          integer not null default 0,
  created_at       timestamptz not null default now()
);

-- Case-insensitive uniqueness on the nickname.
create unique index if not exists profiles_nickname_unique_idx
  on public.profiles (lower(nickname));

alter table public.profiles enable row level security;

drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = user_id);

-- create_profile() runs as the caller (security invoker), so the caller needs
-- an INSERT policy to create their own row.
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Nickname validation rules (shared by create + rename + availability check):
--   * 4–20 characters
--   * letters, numbers, spaces, underscores only
--   * not in a small profanity blocklist
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_nickname(p_name text)
returns boolean
language plpgsql
immutable
as $$
declare
  trimmed text := btrim(p_name);
  blocked text[] := array['admin', 'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'rape'];
  bad text;
begin
  if trimmed is null or char_length(trimmed) < 4 or char_length(trimmed) > 20 then
    return false;
  end if;
  if trimmed !~ '^[A-Za-z0-9 _]+$' then
    return false;
  end if;
  foreach bad in array blocked loop
    if lower(trimmed) like '%' || bad || '%' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- Random "Adjective Animal NN" generator.
create or replace function public.generate_nickname()
returns text
language plpgsql
as $$
declare
  adjectives text[] := array['Lucky','Happy','Brave','Calm','Swift','Bright','Gentle','Bold','Clever','Sunny','Cosmic','Mellow','Witty','Royal','Noble'];
  animals    text[] := array['Heron','Otter','Falcon','Fox','Panda','Lynx','Dolphin','Sparrow','Tiger','Whale','Koala','Raven','Bison','Gecko','Moose'];
begin
  return adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
      || ' ' || animals[1 + floor(random() * array_length(animals, 1))::int]
      || ' ' || (10 + floor(random() * 90)::int)::text;
end;
$$;

-- Create the caller's profile if missing, with a unique random nickname.
create or replace function public.create_profile()
returns public.profiles
language plpgsql
security invoker
as $$
declare
  result public.profiles;
  candidate text;
  attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into result from public.profiles where user_id = auth.uid();
  if found then
    return result;
  end if;

  loop
    candidate := public.generate_nickname();
    attempts := attempts + 1;
    begin
      insert into public.profiles (user_id, nickname)
      values (auth.uid(), candidate)
      returning * into result;
      return result;
    exception when unique_violation then
      if attempts > 10 then
        -- Extremely unlikely; fall back to a guaranteed-unique suffix.
        candidate := candidate || ' ' || substr(auth.uid()::text, 1, 4);
        insert into public.profiles (user_id, nickname)
        values (auth.uid(), candidate)
        returning * into result;
        return result;
      end if;
    end;
  end loop;
end;
$$;

-- Availability check for the rename UI (excludes the caller).
create or replace function public.nickname_available(p_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_valid_nickname(p_name)
     and not exists (
       select 1 from public.profiles
       where lower(nickname) = lower(btrim(p_name))
         and user_id <> auth.uid()
     );
$$;

-- One-time nickname change with validation + uniqueness.
create or replace function public.set_nickname(p_name text)
returns public.profiles
language plpgsql
security invoker
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_valid_nickname(p_name) then
    raise exception 'invalid_nickname';
  end if;
  if exists (
    select 1 from public.profiles
    where lower(nickname) = lower(btrim(p_name)) and user_id <> auth.uid()
  ) then
    raise exception 'nickname_taken';
  end if;
  if (select nickname_changed from public.profiles where user_id = auth.uid()) then
    raise exception 'already_changed';
  end if;

  update public.profiles
     set nickname = btrim(p_name), nickname_changed = true
   where user_id = auth.uid()
  returning * into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 24h cleanup: delete anonymous, email-unverified users older than 24h.
-- Deleting auth.users cascades to profiles and presence.
-- SECURITY DEFINER + owned by a role that can delete from auth.users.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_expired_profiles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  with deleted as (
    delete from auth.users u
    where coalesce(u.is_anonymous, false) = true
      and u.email_confirmed_at is null
      and u.created_at < now() - interval '24 hours'
    returning u.id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

grant execute on function public.create_profile() to authenticated;
grant execute on function public.nickname_available(text) to authenticated;
grant execute on function public.set_nickname(text) to authenticated;

-- Schedule cleanup every 15 minutes. Requires the pg_cron extension
-- (enable it in Supabase: Database -> Extensions -> pg_cron).
-- create extension if not exists pg_cron;
-- select cron.schedule('cleanup-expired-profiles', '*/15 * * * *',
--   $$ select public.cleanup_expired_profiles(); $$);


-- ============================================================
-- migrations/0003_statuses.sql
-- ============================================================

-- Nearby — statuses ("Post Status" / "Create Status")
-- Run AFTER 0002_profiles.sql.
--
-- Model
--  * A status is a short text post (<=100 chars) in a category, pinned at the
--    poster's location, visible to people within the radius for a few hours.
--  * One ACTIVE status per user: posting replaces any existing non-expired one.
--  * Reads of other people's statuses go ONLY through nearby_statuses()
--    (SECURITY DEFINER), which snaps coordinates and never exposes contact info.

create table if not exists public.statuses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  category   text not null default 'other',
  location   geography(Point, 4326) not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint statuses_body_len check (char_length(body) between 1 and 100),
  constraint statuses_category_chk check (
    category in ('food', 'sports', 'walk', 'games', 'study', 'travel', 'other')
  )
);

create index if not exists statuses_location_gix on public.statuses using gist (location);
create index if not exists statuses_expires_idx on public.statuses (expires_at);
create index if not exists statuses_user_idx on public.statuses (user_id);

alter table public.statuses enable row level security;

-- Users manage only their own rows directly; nearby reads use the RPC below.
drop policy if exists "own statuses select" on public.statuses;
create policy "own statuses select" on public.statuses
  for select using (auth.uid() = user_id);

-- post_status() runs as the caller (security invoker), so the caller needs an
-- INSERT policy to create their own status row.
drop policy if exists "own statuses insert" on public.statuses;
create policy "own statuses insert" on public.statuses
  for insert with check (auth.uid() = user_id);

drop policy if exists "own statuses delete" on public.statuses;
create policy "own statuses delete" on public.statuses
  for delete using (auth.uid() = user_id);

-- Post (or replace) my active status. Anyone with a session may post.
create or replace function public.post_status(
  p_body text,
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_ttl_minutes integer default 180
)
returns public.statuses
language plpgsql
security invoker
as $$
declare
  result public.statuses;
  cleaned text := btrim(p_body);
  cat text := lower(coalesce(p_category, 'other'));
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if cleaned is null or char_length(cleaned) < 1 or char_length(cleaned) > 100 then
    raise exception 'invalid_body';
  end if;
  if cat not in ('food', 'sports', 'walk', 'games', 'study', 'travel', 'other') then
    cat := 'other';
  end if;

  -- One active status per user.
  delete from public.statuses where user_id = auth.uid();

  insert into public.statuses (user_id, body, category, location, expires_at)
  values (
    auth.uid(),
    cleaned,
    cat,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    now() + make_interval(mins => greatest(1, least(p_ttl_minutes, 1440)))
  )
  returning * into result;
  return result;
end;
$$;

-- Non-expired statuses within p_radius_m, with poster nickname + coarse coords.
create or replace function public.nearby_statuses(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision
)
returns table (
  id uuid,
  body text,
  category text,
  nickname text,
  lat double precision,
  lng double precision,
  distance_m double precision,
  created_at timestamptz,
  expires_at timestamptz,
  is_mine boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.body,
    s.category,
    coalesce(p.nickname, 'Someone') as nickname,
    round(ST_Y(s.location::geometry)::numeric, 3)::double precision as lat,
    round(ST_X(s.location::geometry)::numeric, 3)::double precision as lng,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_m,
    s.created_at,
    s.expires_at,
    (s.user_id = auth.uid()) as is_mine
  from public.statuses s
  left join public.profiles p on p.user_id = s.user_id
  where s.expires_at > now()
    and ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by s.created_at desc;
$$;

-- Optional hard-delete of expired rows (otherwise they're just filtered out).
create or replace function public.cleanup_expired_statuses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  with deleted as (
    delete from public.statuses where expires_at < now() returning id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

grant execute on function public.post_status(text, text, double precision, double precision, integer) to authenticated;
grant execute on function public.nearby_statuses(double precision, double precision, double precision) to authenticated;

-- Add to the pg_cron schedule alongside the profile cleanup, e.g.:
-- select cron.schedule('cleanup-expired-statuses', '*/15 * * * *',
--   $$ select public.cleanup_expired_statuses(); $$);


-- ============================================================
-- migrations/0004_meetups.sql
-- ============================================================

-- Nearby — "Ask to join" requests & meetups
-- Run AFTER 0003_statuses.sql.
--
-- Flow
--  * Someone nearby taps "Ask to join" on a status -> a pending join_request.
--  * The host accepts or declines. On accept it becomes a meetup and both the
--    host's and requester's profiles.meetups counter is incremented (once).
--
-- Security
--  * RLS: a row is visible only to its requester or host.
--  * All mutations go through RPCs that re-check auth.uid() against the right
--    role; meetups increments run in a SECURITY DEFINER function so a host can
--    bump the requester's counter without broad write access to profiles.

create table if not exists public.join_requests (
  id           uuid primary key default gen_random_uuid(),
  status_id    uuid not null references public.statuses (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  host_id      uuid not null references auth.users (id) on delete cascade,
  state        text not null default 'pending'
                 check (state in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  unique (status_id, requester_id)
);

create index if not exists join_requests_host_idx on public.join_requests (host_id);
create index if not exists join_requests_requester_idx on public.join_requests (requester_id);

alter table public.join_requests enable row level security;

drop policy if exists "join visible to parties" on public.join_requests;
create policy "join visible to parties" on public.join_requests
  for select using (auth.uid() = requester_id or auth.uid() = host_id);

-- Ask to join a status. Requester = caller; host derived from the status.
create or replace function public.request_to_join(p_status_id uuid)
returns public.join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
  result public.join_requests;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_host
  from public.statuses
  where id = p_status_id and expires_at > now();

  if v_host is null then
    raise exception 'status_unavailable';
  end if;
  if v_host = auth.uid() then
    raise exception 'own_status';
  end if;

  insert into public.join_requests (status_id, requester_id, host_id)
  values (p_status_id, auth.uid(), v_host)
  on conflict (status_id, requester_id) do nothing;

  select * into result
  from public.join_requests
  where status_id = p_status_id and requester_id = auth.uid();
  return result;
end;
$$;

-- Host accepts/declines. On accept, increment both meetup counters once.
create or replace function public.respond_to_join(p_request_id uuid, p_accept boolean)
returns public.join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.join_requests;
  result public.join_requests;
begin
  select * into req from public.join_requests where id = p_request_id;
  if not found then
    raise exception 'not_found';
  end if;
  if req.host_id <> auth.uid() then
    raise exception 'not_host';
  end if;
  if req.state <> 'pending' then
    raise exception 'not_pending';
  end if;

  if p_accept then
    update public.join_requests
       set state = 'accepted', responded_at = now()
     where id = p_request_id
    returning * into result;

    update public.profiles
       set meetups = meetups + 1
     where user_id in (req.host_id, req.requester_id);
  else
    update public.join_requests
       set state = 'declined', responded_at = now()
     where id = p_request_id
    returning * into result;
  end if;

  return result;
end;
$$;

-- Requester cancels their own pending request.
create or replace function public.cancel_join(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.join_requests
     set state = 'cancelled', responded_at = now()
   where id = p_request_id and requester_id = auth.uid() and state = 'pending';
end;
$$;

-- All join activity relevant to me (incoming as host + outgoing as requester),
-- enriched with nicknames and the status context.
create or replace function public.my_join_activity()
returns table (
  id uuid,
  status_id uuid,
  requester_id uuid,
  host_id uuid,
  state text,
  created_at timestamptz,
  requester_nickname text,
  host_nickname text,
  status_body text,
  status_category text
)
language sql
security definer
set search_path = public
as $$
  select
    jr.id,
    jr.status_id,
    jr.requester_id,
    jr.host_id,
    jr.state,
    jr.created_at,
    coalesce(rp.nickname, 'Someone') as requester_nickname,
    coalesce(hp.nickname, 'Someone') as host_nickname,
    s.body as status_body,
    s.category as status_category
  from public.join_requests jr
  join public.statuses s on s.id = jr.status_id
  left join public.profiles rp on rp.user_id = jr.requester_id
  left join public.profiles hp on hp.user_id = jr.host_id
  where auth.uid() in (jr.requester_id, jr.host_id)
  order by jr.created_at desc;
$$;

grant execute on function public.request_to_join(uuid) to authenticated;
grant execute on function public.respond_to_join(uuid, boolean) to authenticated;
grant execute on function public.cancel_join(uuid) to authenticated;
grant execute on function public.my_join_activity() to authenticated;



-- ============================================================
-- migrations/0005_posts.sql
-- ============================================================

-- Run AFTER 0004_meetups.sql.
--
-- Model
--  * A "post" is a short text (<=140) in a category, optionally with one square
--    image, pinned at the poster's COARSE location, alive for exactly 1 hour.
--  * One ACTIVE post per user: creating a new one replaces (and deletes the
--    image of) the previous one.
--  * The map loads posts by VIEWPORT bounds (no fixed radius) via a
--    SECURITY DEFINER RPC that returns snapped coordinates + author nickname.
--  * Comments are public, text-only (<=200), and cascade-delete with the post.
--  * cleanup_expired_posts() hard-deletes expired posts AND their storage
--    objects; deleting a post cascades to its comments.

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  body        text not null default '',
  category    text not null default 'other',
  image_path  text,
  image_url   text,
  location    geography(Point, 4326) not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  constraint posts_body_len check (char_length(body) <= 140),
  -- A post must have at least a body or an image.
  constraint posts_has_content check (char_length(btrim(body)) > 0 or image_path is not null),
  constraint posts_category_chk check (
    category in ('food', 'sports', 'walk', 'games', 'study', 'travel', 'other')
  )
);

create index if not exists posts_location_gix on public.posts using gist (location);
create index if not exists posts_expires_idx on public.posts (expires_at);
create index if not exists posts_user_idx on public.posts (user_id);

alter table public.posts enable row level security;

-- Direct table access is OWN-ROW only (exact location never leaks); everyone
-- else reads through posts_in_bounds() which snaps the coordinates.
drop policy if exists "own posts select" on public.posts;
create policy "own posts select" on public.posts
  for select using (auth.uid() = user_id);

drop policy if exists "own posts insert" on public.posts;
create policy "own posts insert" on public.posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "own posts delete" on public.posts;
create policy "own posts delete" on public.posts
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Comments — public text threads on a post.
-- ---------------------------------------------------------------------------
create table if not exists public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  constraint comment_body_len check (char_length(btrim(body)) between 1 and 200)
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

-- Reads/writes go through SECURITY DEFINER RPCs; keep direct access minimal.
drop policy if exists "own comments select" on public.post_comments;
create policy "own comments select" on public.post_comments
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Delete the storage object backing a post image (best-effort).
-- ---------------------------------------------------------------------------
create or replace function public.delete_post_image(p_path text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if p_path is not null then
    delete from storage.objects
     where bucket_id = 'post-images' and name = p_path;
  end if;
end;
$$;

-- Create (or replace) my single active post.
create or replace function public.create_post(
  p_body text,
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_image_path text default null,
  p_image_url text default null
)
returns public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.posts;
  cleaned text := btrim(coalesce(p_body, ''));
  cat text := lower(coalesce(p_category, 'other'));
  old_path text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if char_length(cleaned) > 140 then
    raise exception 'invalid_body';
  end if;
  if char_length(cleaned) = 0 and p_image_path is null then
    raise exception 'empty_post';
  end if;
  if cat not in ('food', 'sports', 'walk', 'games', 'study', 'travel', 'other') then
    cat := 'other';
  end if;

  -- Remove the previous active post (and its image) — one active post per user.
  for old_path in select image_path from public.posts where user_id = auth.uid() and image_path is not null
  loop
    perform public.delete_post_image(old_path);
  end loop;
  delete from public.posts where user_id = auth.uid();

  insert into public.posts (user_id, body, category, image_path, image_url, location, expires_at)
  values (
    auth.uid(),
    cleaned,
    cat,
    p_image_path,
    p_image_url,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    now() + interval '1 hour'
  )
  returning * into result;
  return result;
end;
$$;

-- Delete my active post (and its image).
create or replace function public.delete_my_post()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_path text;
begin
  for old_path in select image_path from public.posts where user_id = auth.uid() and image_path is not null
  loop
    perform public.delete_post_image(old_path);
  end loop;
  delete from public.posts where user_id = auth.uid();
end;
$$;

-- All non-expired posts within the given map viewport (snapped coords).
create or replace function public.posts_in_bounds(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision
)
returns table (
  id uuid,
  body text,
  category text,
  image_url text,
  nickname text,
  lat double precision,
  lng double precision,
  comment_count bigint,
  created_at timestamptz,
  expires_at timestamptz,
  is_mine boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.body,
    p.category,
    p.image_url,
    coalesce(pr.nickname, 'Someone') as nickname,
    round(ST_Y(p.location::geometry)::numeric, 3)::double precision as lat,
    round(ST_X(p.location::geometry)::numeric, 3)::double precision as lng,
    (select count(*) from public.post_comments c where c.post_id = p.id) as comment_count,
    p.created_at,
    p.expires_at,
    (p.user_id = auth.uid()) as is_mine
  from public.posts p
  left join public.profiles pr on pr.user_id = p.user_id
  where p.expires_at > now()
    and ST_Y(p.location::geometry) between p_min_lat and p_max_lat
    and ST_X(p.location::geometry) between p_min_lng and p_max_lng
  order by p.created_at desc
  limit 300;
$$;

-- Post a comment. Anyone with a session may comment on a live post.
create or replace function public.add_comment(p_post_id uuid, p_body text)
returns public.post_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.post_comments;
  cleaned text := btrim(p_body);
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if char_length(cleaned) < 1 or char_length(cleaned) > 200 then
    raise exception 'invalid_comment';
  end if;
  if not exists (select 1 from public.posts where id = p_post_id and expires_at > now()) then
    raise exception 'post_unavailable';
  end if;

  insert into public.post_comments (post_id, user_id, body)
  values (p_post_id, auth.uid(), cleaned)
  returning * into result;
  return result;
end;
$$;

-- Delete a comment: the comment author OR the post owner may delete it.
create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.post_comments c
  using public.posts p
  where c.id = p_comment_id
    and c.post_id = p.id
    and (c.user_id = auth.uid() or p.user_id = auth.uid());
end;
$$;

-- Comments for a post, newest last, with author nickname + ownership flags.
create or replace function public.post_comments_list(p_post_id uuid)
returns table (
  id uuid,
  body text,
  nickname text,
  created_at timestamptz,
  is_mine boolean,
  can_delete boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.body,
    coalesce(pr.nickname, 'Someone') as nickname,
    c.created_at,
    (c.user_id = auth.uid()) as is_mine,
    (c.user_id = auth.uid() or p.user_id = auth.uid()) as can_delete
  from public.post_comments c
  join public.posts p on p.id = c.post_id
  left join public.profiles pr on pr.user_id = c.user_id
  where c.post_id = p_post_id
  order by c.created_at asc
  limit 500;
$$;

-- Hard-delete expired posts and their storage images (comments cascade).
create or replace function public.cleanup_expired_posts()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  removed integer;
begin
  delete from storage.objects o
   where o.bucket_id = 'post-images'
     and o.name in (select image_path from public.posts where expires_at < now() and image_path is not null);

  with deleted as (
    delete from public.posts where expires_at < now() returning id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;

grant execute on function public.create_post(text, text, double precision, double precision, text, text) to authenticated;
grant execute on function public.delete_my_post() to authenticated;
grant execute on function public.posts_in_bounds(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.add_comment(uuid, text) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.post_comments_list(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for post images (public read, owner-scoped writes).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post images public read" on storage.objects;
create policy "post images public read" on storage.objects
  for select using (bucket_id = 'post-images');

-- Authenticated users may upload only into their own uid/ folder.
drop policy if exists "post images owner insert" on storage.objects;
create policy "post images owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post images owner delete" on storage.objects;
create policy "post images owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Schedule cleanup every few minutes alongside the others (requires pg_cron):
-- select cron.schedule('cleanup-expired-posts', '*/5 * * * *',
--   $$ select public.cleanup_expired_posts(); $$);
