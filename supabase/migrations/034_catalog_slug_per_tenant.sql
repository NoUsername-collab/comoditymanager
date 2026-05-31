-- 034 — Catalog slugs must be unique per tenant, not globally
-- Fixes signup: onboard_new_tenant inserts ac/fridge/twin per tenant

alter table public.room_option_definitions
  drop constraint if exists room_option_definitions_slug_key;

alter table public.room_type_definitions
  drop constraint if exists room_type_definitions_slug_key;

create unique index if not exists room_option_definitions_tenant_slug_key
  on public.room_option_definitions (tenant_id, slug);

create unique index if not exists room_type_definitions_tenant_slug_key
  on public.room_type_definitions (tenant_id, slug);
