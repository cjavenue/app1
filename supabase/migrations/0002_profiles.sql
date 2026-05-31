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
