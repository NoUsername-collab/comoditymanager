-- Fix: onboard_new_tenant() inserts pension_settings without admin_palette_key,
-- relying on a column default of 'pension' (from migration 008) which violates
-- the CHECK constraint added in migration 011 (only allows 'default', 'win95', etc.).
-- Migration 011 changed the default to 'default' but some DB instances may not
-- have applied it correctly. This migration fixes both the function and the default.

-- Ensure column default is 'default' (not 'pension')
alter table public.pension_settings
  alter column admin_palette_key set default 'default';

-- Redefine onboard_new_tenant to explicitly set admin_palette_key
create or replace function public.onboard_new_tenant(
  p_slug text,
  p_display_name text,
  p_owner_id uuid,
  p_owner_email text,
  p_locale text default 'ro',
  p_country text default 'RO',
  p_timezone text default 'Europe/Bucharest',
  p_platform_domain text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
  v_domain text;
  v_platform_domain text;
begin
  v_platform_domain := nullif(trim(p_platform_domain), '');

  if v_platform_domain is null then
    select ps.value into v_platform_domain
    from public.platform_settings ps
    where ps.key = 'tenant_domain_suffix';
  end if;

  if v_platform_domain is null or v_platform_domain = '' then
    raise exception 'platform domain not configured';
  end if;

  v_domain := p_slug || '.' || v_platform_domain;

  insert into public.tenants (
    slug, display_name, plan_id, owner_id, owner_email,
    status, trial_ends_at, locale, country, timezone
  )
  values (
    p_slug, p_display_name, 'free', p_owner_id, p_owner_email,
    'trial', now() + interval '30 days', p_locale, p_country, p_timezone
  )
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, email, role, accepted_at)
  values (v_tenant_id, p_owner_id, p_owner_email, 'owner', now());

  insert into public.pension_settings (tenant_id, display_name, admin_palette_key)
  values (v_tenant_id, p_display_name, 'default');

  insert into public.room_option_definitions (tenant_id, slug, name, price_per_night_addon, sort_order, is_system)
  values
    (v_tenant_id, 'ac',     'Aer conditionat', 0, 10, true),
    (v_tenant_id, 'fridge', 'Frigider',        0, 20, true);

  insert into public.room_type_definitions (tenant_id, slug, name, capacity_base, base_price_per_night, sort_order, is_system)
  values
    (v_tenant_id, 'twin',   'Twin',   2, 0, 10, true),
    (v_tenant_id, 'double', 'Double', 2, 0, 20, true),
    (v_tenant_id, 'triple', 'Triple', 3, 0, 30, true);

  insert into public.tenant_domains (
    tenant_id, domain, routing_kind, verified, verified_at, ssl_active
  )
  values (
    v_tenant_id, v_domain, 'hospira_subdomain', true, now(), true
  );

  return v_tenant_id;
end;
$$;
