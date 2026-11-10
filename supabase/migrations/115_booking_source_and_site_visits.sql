-- 115 — Where each booking came from, and anonymous visits to the public site.
--
-- Bookings: `source` says how a stay entered the system. Rows from before this
-- migration cannot be told apart and stay 'unknown'.
--
-- Visits: one row per page view, with no cookie, no IP and no browser string
-- stored. A visitor is a hash of (today's random salt, tenant, IP, browser);
-- the salt is replaced every day and the old one deleted, so a hash only ties
-- views together within one day and can never be traced back to a person.

alter table public.bookings
  add column if not exists source text not null default 'unknown'
  check (source in ('site', 'staff', 'phone', 'unknown'));

comment on column public.bookings.source is
  'Cum a intrat rezervarea: site (formularul public), staff (calendar, duplicare, rerezervare), phone (formularul de telefon), unknown (dinainte de 115).';

create index if not exists bookings_tenant_source_created_idx
  on public.bookings (tenant_id, source, created_at);

create table if not exists public.public_site_visits (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  visited_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 200),
  -- The site the visitor came from (google.com), never the full address; null = direct.
  referrer_host text check (referrer_host is null or char_length(referrer_host) between 1 and 120),
  visitor text not null check (char_length(visitor) = 64)
);

create index if not exists public_site_visits_tenant_time_idx
  on public.public_site_visits (tenant_id, visited_at);

alter table public.public_site_visits enable row level security;

-- Staff read their own site's visits; rows are written only by record_public_site_visit.
drop policy if exists public_site_visits_tenant_read on public.public_site_visits;
create policy public_site_visits_tenant_read
  on public.public_site_visits
  for select
  using (public.tenant_row_visible(tenant_id));

comment on table public.public_site_visits is
  'Vizite anonime pe site-ul public: fără cookie, fără IP. Vizitatorul e un hash cu sare zilnică ștearsă a doua zi.';

-- One random salt per day; yesterday's is deleted when today's is made.
create table if not exists public.public_site_visit_salts (
  day date primary key,
  salt bytea not null
);

alter table public.public_site_visit_salts enable row level security;
-- No policies: only the function below (security definer) reads or writes salts.

create or replace function public.record_public_site_visit(
  p_tenant_id uuid,
  p_path text,
  p_referrer_host text,
  p_client text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_salt bytea;
begin
  if p_tenant_id is null or coalesce(p_client, '') = '' then
    return;
  end if;

  select salt into v_salt from public.public_site_visit_salts where day = v_day;
  if v_salt is null then
    insert into public.public_site_visit_salts (day, salt)
    values (v_day, gen_random_bytes(32))
    on conflict (day) do nothing;
    select salt into v_salt from public.public_site_visit_salts where day = v_day;
    delete from public.public_site_visit_salts where day < v_day;
  end if;

  insert into public.public_site_visits (tenant_id, path, referrer_host, visitor)
  values (
    p_tenant_id,
    left(coalesce(nullif(p_path, ''), '/'), 200),
    nullif(left(coalesce(p_referrer_host, ''), 120), ''),
    encode(digest(v_salt || convert_to(p_tenant_id::text || '|' || p_client, 'utf8'), 'sha256'), 'hex')
  );
end;
$$;

revoke all on function public.record_public_site_visit(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_public_site_visit(uuid, text, text, text) to service_role;

comment on function public.record_public_site_visit(uuid, text, text, text) is
  'Înregistrează o vizită anonimă. p_client (IP + browser) se folosește doar pentru hash și nu se salvează.';

-- ── Reading the numbers (staff, through their own tenant's row rules) ──

-- Visits and visitors per day. A visitor is counted once per day (the hash
-- changes daily), so a month's visitors are the sum of its daily visitors.
create or replace function public.public_site_visit_days(p_tenant_id uuid, p_since date)
returns table (day date, visits bigint, visitors bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select (v.visited_at at time zone 'utc')::date as day,
         count(*) as visits,
         count(distinct v.visitor) as visitors
  from public.public_site_visits v
  where v.tenant_id = p_tenant_id
    and v.visited_at >= p_since
  group by 1
  order by 1;
$$;

-- Most seen pages, or the sites visitors came from (null = direct), since a date.
create or replace function public.public_site_visit_top(p_tenant_id uuid, p_since date, p_kind text, p_limit int default 8)
returns table (label text, visits bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select case when p_kind = 'referrer' then v.referrer_host else v.path end as label,
         count(*) as visits
  from public.public_site_visits v
  where v.tenant_id = p_tenant_id
    and v.visited_at >= p_since
  group by 1
  order by 2 desc, 1
  limit greatest(1, least(p_limit, 50));
$$;

-- Bookings made per day, by where they came from, and how many were confirmed.
create or replace function public.booking_source_days(p_tenant_id uuid, p_since date)
returns table (day date, source text, requests bigint, confirmed bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select (b.created_at at time zone 'utc')::date as day,
         b.source,
         count(*) as requests,
         count(*) filter (where b.status = 'confirmata') as confirmed
  from public.bookings b
  where b.tenant_id = p_tenant_id
    and b.created_at >= p_since
  group by 1, 2
  order by 1, 2;
$$;

grant execute on function public.public_site_visit_days(uuid, date) to authenticated;
grant execute on function public.public_site_visit_top(uuid, date, text, int) to authenticated;
grant execute on function public.booking_source_days(uuid, date) to authenticated;
