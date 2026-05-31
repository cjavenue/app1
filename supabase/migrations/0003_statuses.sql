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
