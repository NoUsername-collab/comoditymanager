-- 102 — Per-property guest loyalty reference (not a login, not a platform network).

alter table public.guest_app_settings
  add column if not exists loyalty jsonb not null default '{"enabled":false}'::jsonb;

comment on column public.guest_app_settings.loyalty is
  'Property loyalty program for the guest app: enabled, nightsForPerk, perkTitle, perkDescription.';

create table if not exists public.guest_loyalty_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  reference_code text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (tenant_id, guest_id),
  unique (tenant_id, reference_code)
);

comment on table public.guest_loyalty_refs is
  'Opaque guest reference scoped to one property. Possession of the code is access; no password.';

create index if not exists guest_loyalty_refs_tenant_code_idx
  on public.guest_loyalty_refs (tenant_id, reference_code)
  where revoked_at is null;

alter table public.guest_loyalty_refs enable row level security;

drop policy if exists tenant_isolation_guest_loyalty_refs on public.guest_loyalty_refs;
create policy tenant_isolation_guest_loyalty_refs
  on public.guest_loyalty_refs
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
