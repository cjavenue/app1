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
