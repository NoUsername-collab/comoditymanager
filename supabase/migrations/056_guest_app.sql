-- =============================================================================
-- 056 — Guest app (Alfred-style): tenant settings + per-booking access codes
-- Oaspetele accesează /stay/{code} — cod unic, valabil pe durata șederii.
-- =============================================================================

create table if not exists public.guest_app_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,

  enabled boolean not null default true,
  /** Culori, logo override, layout — mock Alfred theme */
  appearance jsonb not null default '{}'::jsonb,
  /** Toggle-uri feature (plata online off implicit) */
  features jsonb not null default '{}'::jsonb,
  /** Conținut: hotel, wifi, servicii, tips, green option — mock până la integrări */
  content jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_guest_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,

  access_code text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,

  unique (tenant_id, access_code),
  unique (booking_id)
);

create index if not exists booking_guest_access_tenant_code_idx
  on public.booking_guest_access (tenant_id, access_code)
  where revoked_at is null;

alter table public.guest_app_settings enable row level security;
alter table public.booking_guest_access enable row level security;

drop policy if exists tenant_isolation_guest_app_settings on public.guest_app_settings;
create policy tenant_isolation_guest_app_settings
  on public.guest_app_settings
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation_booking_guest_access on public.booking_guest_access;
create policy tenant_isolation_booking_guest_access
  on public.booking_guest_access
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop trigger if exists guest_app_settings_updated_at on public.guest_app_settings;
create trigger guest_app_settings_updated_at
  before update on public.guest_app_settings
  for each row execute function public.set_updated_at();

comment on table public.guest_app_settings is
  'Config guest app per tenant — theme, mock features, conținut oaspeți.';
comment on table public.booking_guest_access is
  'Cod unic de acces web per rezervare confirmată; revocat/expirat după checkout.';
