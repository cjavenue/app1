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
