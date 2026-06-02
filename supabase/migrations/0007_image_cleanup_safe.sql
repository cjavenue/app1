-- Nearby — make post-image storage cleanup best-effort
-- Run AFTER 0006_cron.sql.
--
-- Bug: create_post() replaces a user's previous post and tried to delete that
-- post's image from storage.objects inside the same transaction. That DELETE
-- can raise "permission denied for table objects" (storage.objects is owned by
-- supabase_storage_admin, not postgres), which aborted the whole post — so
-- OVERWRITING an existing post with an image failed while the first post
-- succeeded. Fix: swallow any storage-delete error so posting never fails;
-- orphaned images are still reclaimed best-effort by the cron job.

create or replace function public.delete_post_image(p_path text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if p_path is not null then
    begin
      delete from storage.objects
       where bucket_id = 'post-images' and name = p_path;
    exception when others then
      -- Best-effort only; never let image cleanup abort the caller.
      null;
    end;
  end if;
end;
$$;

-- Recreate cleanup_expired_posts with the storage delete guarded too.
create or replace function public.cleanup_expired_posts()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  removed integer;
begin
  begin
    delete from storage.objects o
     where o.bucket_id = 'post-images'
       and o.name in (select image_path from public.posts where expires_at < now() and image_path is not null);
  exception when others then
    null; -- best-effort image cleanup
  end;

  with deleted as (
    delete from public.posts where expires_at < now() returning id
  )
  select count(*) into removed from deleted;
  return removed;
end;
$$;
