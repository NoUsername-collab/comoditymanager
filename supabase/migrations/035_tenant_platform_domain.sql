-- 035 — Tenant subdomain matches platform domain (test.hospira.ro vs hospira.ro)

create or replace function public.onboard_new_tenant(
  p_slug text,
  p_display_name text,
  p_owner_id uuid,
  p_owner_email text,
  p_locale text default 'ro',
  p_country text default 'RO',
  p_timezone text default 'Europe/Bucharest',
  p_platform_domain text default 'hospira.ro'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
  v_domain text;
begin
  if p_platform_domain is null or trim(p_platform_domain) = '' then
    p_platform_domain := 'hospira.ro';
  end if;

  v_domain := p_slug || '.' || trim(p_platform_domain);

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
  values (v_tenant_id, v_domain, true, now(), true);

  return v_tenant_id;
end;
$$;

comment on function public.onboard_new_tenant is
  'Onboarding: tenant + member + catalog + subdomain on p_platform_domain (e.g. test.hospira.ro).';

-- Staging backfill: register slug.test.hospira.ro for existing tenants
insert into public.tenant_domains (tenant_id, domain, verified, verified_at, ssl_active)
select t.id, t.slug || '.test.hospira.ro', true, now(), true
from public.tenants t
where not exists (
  select 1
  from public.tenant_domains td
  where td.tenant_id = t.id
    and td.domain = t.slug || '.test.hospira.ro'
);
