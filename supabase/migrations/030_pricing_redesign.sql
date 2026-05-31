-- =============================================================================
-- 030 — Pricing redesign: Free/Essential/Professional/Business
-- =============================================================================

-- 1. DROP old constraint first (cannot rename plan_id values until this runs)
alter table public.tenants drop constraint if exists tenants_plan_id_check;

-- 2. Migrate existing data
update public.tenants set plan_id = 'free' where plan_id = 'starter';
update public.tenants set plan_id = 'essential' where plan_id = 'standard';
update public.tenants set plan_id = 'professional' where plan_id = 'pro';
-- 'business' stays as 'business'

-- Local plans
update public.tenants set plan_id = 'local_essential' where plan_id = 'local_basic';
update public.tenants set plan_id = 'local_professional' where plan_id = 'local_pro';
-- 'local_business' stays

-- Hybrid plans
update public.tenants set plan_id = 'hybrid_essential' where plan_id = 'hybrid_basic';
update public.tenants set plan_id = 'hybrid_professional' where plan_id = 'hybrid_pro';
-- 'hybrid_business' stays

-- Fallback: unknown values → free
update public.tenants
set plan_id = 'free', updated_at = now()
where plan_id is null
   or plan_id not in (
    'free', 'essential', 'professional', 'business',
    'local_essential', 'local_professional', 'local_business',
    'hybrid_essential', 'hybrid_professional', 'hybrid_business'
  );

-- 3. Add new constraint
alter table public.tenants add constraint tenants_plan_id_check
  check (plan_id in (
    'free', 'essential', 'professional', 'business',
    'local_essential', 'local_professional', 'local_business',
    'hybrid_essential', 'hybrid_professional', 'hybrid_business'
  ));

-- 3. Update onboard_new_tenant to use 'free' instead of 'starter'
create or replace function public.onboard_new_tenant(
  p_slug text,
  p_display_name text,
  p_owner_id uuid,
  p_owner_email text,
  p_locale text default 'ro',
  p_country text default 'RO',
  p_timezone text default 'Europe/Bucharest'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
begin
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

  insert into public.pension_settings (tenant_id, display_name)
  values (v_tenant_id, p_display_name);

  insert into public.room_option_definitions (tenant_id, slug, name, price_per_night_addon, sort_order, is_system)
  values
    (v_tenant_id, 'ac',     'Aer conditionat', 0, 10, true),
    (v_tenant_id, 'fridge', 'Frigider',        0, 20, true);

  insert into public.room_type_definitions (tenant_id, slug, name, capacity_base, base_price_per_night, sort_order, is_system)
  values
    (v_tenant_id, 'twin',   'Twin',   2, 0, 10, true),
    (v_tenant_id, 'double', 'Double', 2, 0, 20, true),
    (v_tenant_id, 'triple', 'Triple', 3, 0, 30, true);

  insert into public.tenant_domains (tenant_id, domain, verified, verified_at, ssl_active)
  values (v_tenant_id, p_slug || '.hospira.ro', true, now(), true);

  return v_tenant_id;
end;
$$;

comment on function public.onboard_new_tenant is
  'Atomic onboarding: tenant on Free plan + member + settings + catalog + subdomain.';
