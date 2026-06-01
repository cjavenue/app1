-- Nearby — map posts with optional image, comments & 1-hour lifetime
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
