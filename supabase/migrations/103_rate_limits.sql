-- 103 — Rate limits that survive serverless restarts.
--
-- The app kept request counters in process memory, so every Vercel cold start
-- reset them. Counters now live here, one row per key and fixed time window.
-- Only the server (service role) touches this table or function.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

comment on table public.rate_limits is
  'Request counters per key (e.g. "login:<ip>") and fixed window. Written only by rate_limit_hit().';

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;

create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

-- Counts one hit and says whether it is still within the limit.
create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
    do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Old windows are useless; trim them now and then instead of on every call.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
