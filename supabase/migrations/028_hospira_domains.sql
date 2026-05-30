-- 028 — Use hospira.ro for tenant subdomains (was rezova.ro in 026)

-- Fix onboard_new_tenant to register slug.hospira.ro
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
  insert into public.tenants (slug, display_name, plan_id, owner_id, owner_email, status, locale, country, timezone, trial_ends_at)
  values (
    p_slug,
    p_display_name,
    'starter',
    p_owner_id,
    p_owner_email,
    'trial',
    p_locale,
    p_country,
    p_timezone,
    now() + interval '30 days'
  )
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, email, role, accepted_at)
  values (v_tenant_id, p_owner_id, p_owner_email, 'owner', now());

  insert into public.pension_settings (tenant_id, display_name)
  values (v_tenant_id, p_display_name);

  insert into public.room_option_definitions (tenant_id, slug, name, price_per_night_addon, sort_order, is_system)
  values
    (v_tenant_id, 'ac',     'Aer condiționat', 0, 10, true),
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

-- Migrate existing subdomain entries
update public.tenant_domains
set domain = replace(domain, '.rezova.ro', '.hospira.ro')
where domain like '%.rezova.ro';

-- Ensure Casa Emil subdomain exists
insert into public.tenant_domains (tenant_id, domain, verified, verified_at, ssl_active)
select t.id, t.slug || '.hospira.ro', true, now(), true
from public.tenants t
where not exists (
  select 1 from public.tenant_domains td
  where td.tenant_id = t.id and td.domain = t.slug || '.hospira.ro'
);
