-- Nearby — scheduled cleanup via pg_cron
-- Run AFTER 0005_posts.sql.
--
-- Enables pg_cron and (re)schedules the three cleanup jobs. Idempotent: each
-- job is unscheduled first if it already exists, so this is safe to re-run.
--
-- Note: pg_cron must be available on the instance. On Supabase it lives in the
-- `extensions` schema and can also be toggled via Database → Extensions.

create extension if not exists pg_cron;

-- Helper: (re)schedule a named job without erroring if it already exists.
create or replace function public.ensure_cron_job(p_name text, p_schedule text, p_command text)
returns void
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
begin
  -- Remove any existing job with this name (cron.unschedule throws if absent).
  if exists (select 1 from cron.job where jobname = p_name) then
    perform cron.unschedule(p_name);
  end if;
  perform cron.schedule(p_name, p_schedule, p_command);
end;
$$;

-- Posts + their images expire after 1 hour — purge frequently.
select public.ensure_cron_job(
  'cleanup-expired-posts', '*/5 * * * *',
  $$ select public.cleanup_expired_posts(); $$
);

-- Statuses (older feature) — purge expired rows.
select public.ensure_cron_job(
  'cleanup-expired-statuses', '*/15 * * * *',
  $$ select public.cleanup_expired_statuses(); $$
);

-- Unverified anonymous profiles older than 24h.
select public.ensure_cron_job(
  'cleanup-expired-profiles', '*/15 * * * *',
  $$ select public.cleanup_expired_profiles(); $$
);
