-- ============================================================
-- 048: Check-in System — tables + pension_settings extensions
-- ============================================================

-- ── checkins ─────────────────────────────────────────────────
create table if not exists public.checkins (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id),
  booking_id      uuid not null references public.bookings(id),
  type            text not null check (type in ('reservation','walkin','group')),
  status          text not null default 'complete'
                    check (status in ('complete','incomplete','blocked')),
  checked_in_at   timestamptz not null default now(),
  checked_in_by   uuid,
  payment_status  text not null default 'unpaid'
                    check (payment_status in ('paid','partial','unpaid')),
  payment_amount_paid numeric default 0,
  deposit_amount      numeric default 0,
  key_handed      boolean default false,
  flags           text[] default '{}',
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.checkins enable row level security;

drop policy if exists "tenant_isolation_checkins" on public.checkins;
create policy "tenant_isolation_checkins"
  on public.checkins using (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

create index if not exists idx_checkins_booking
  on public.checkins(booking_id);
create index if not exists idx_checkins_tenant
  on public.checkins(tenant_id);

-- ── checkin_guests ───────────────────────────────────────────
create table if not exists public.checkin_guests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id),
  checkin_id      uuid not null references public.checkins(id) on delete cascade,
  guest_id        uuid references public.guests(id),
  full_name       text not null,
  phone           text,
  document_type   text check (document_type is null or document_type in ('ci','pasaport','permis')),
  document_number text,
  nationality     text,
  birth_date      date,
  is_representative boolean default false,
  checked_in_at   timestamptz
);

alter table public.checkin_guests enable row level security;

drop policy if exists "tenant_isolation_checkin_guests" on public.checkin_guests;
create policy "tenant_isolation_checkin_guests"
  on public.checkin_guests using (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

create index if not exists idx_checkin_guests_checkin
  on public.checkin_guests(checkin_id);

-- ── pension_settings extensions ──────────────────────────────
alter table public.pension_settings
  add column if not exists checkin_doc_rule text not null default 'recommended'
    check (checkin_doc_rule in ('required','recommended','optional')),
  add column if not exists checkin_phone_rule text not null default 'recommended'
    check (checkin_phone_rule in ('required','recommended','optional')),
  add column if not exists checkin_payment_rule text not null default 'at_checkout'
    check (checkin_payment_rule in ('full','partial','at_checkout')),
  add column if not exists checkin_min_payment_pct integer not null default 30,
  add column if not exists checkin_deposit boolean not null default false,
  add column if not exists checkin_deposit_amount numeric default 0,
  add column if not exists walkin_allowed boolean not null default true,
  add column if not exists group_checkin_mode text not null default 'both'
    check (group_checkin_mode in ('rep','individual','both')),
  add column if not exists checkin_time_from time default '14:00',
  add column if not exists checkout_time_until time default '12:00',
  add column if not exists late_checkout_allowed boolean not null default true,
  add column if not exists late_checkout_fee numeric default 0,
  add column if not exists early_checkin_allowed boolean not null default true,
  add column if not exists early_checkin_fee numeric default 0;
