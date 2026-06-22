-- 085 — Nestio → Hospira: restore platform tenant subdomains + platform_settings suffix

update public.platform_settings
set value = 'hospira.ro'
where key = 'tenant_domain_suffix'
  and value in ('nestio.ro', 'rezova.ro');

update public.platform_settings
set value = 'test.hospira.ro'
where key = 'tenant_domain_suffix'
  and value in ('test.nestio.ro', 'test.rezova.ro');

-- Rename *.nestio.ro subdomain rows when *.hospira.ro does not exist yet
update public.tenant_domains td
set domain = t.slug || '.hospira.ro'
from public.tenants t
where td.tenant_id = t.id
  and td.domain = t.slug || '.nestio.ro'
  and not exists (
    select 1
    from public.tenant_domains td2
    where td2.tenant_id = t.id
      and td2.domain = t.slug || '.hospira.ro'
  );

-- Staging: rename *.test.nestio.ro → *.test.hospira.ro when missing
update public.tenant_domains td
set domain = t.slug || '.test.hospira.ro'
from public.tenants t
where td.tenant_id = t.id
  and td.domain = t.slug || '.test.nestio.ro'
  and not exists (
    select 1
    from public.tenant_domains td2
    where td2.tenant_id = t.id
      and td2.domain = t.slug || '.test.hospira.ro'
  );

-- Ensure every active/trial tenant has a Hospira subdomain row
insert into public.tenant_domains (tenant_id, domain, routing_kind, verified, verified_at, ssl_active)
select
  t.id,
  t.slug || '.hospira.ro',
  'hospira_subdomain',
  true,
  now(),
  true
from public.tenants t
where t.status in ('active', 'trial')
  and not exists (
    select 1
    from public.tenant_domains td
    where td.tenant_id = t.id
      and td.domain = t.slug || '.hospira.ro'
  );

-- Restore onboard_new_tenant default subdomain to hospira.ro
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
  v_suffix text;
begin
  select coalesce(
    (select value from public.platform_settings where key = 'tenant_domain_suffix'),
    'hospira.ro'
  ) into v_suffix;

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

  insert into public.tenant_domains (tenant_id, domain, routing_kind, verified, verified_at, ssl_active)
  values (v_tenant_id, p_slug || '.' || v_suffix, 'hospira_subdomain', true, now(), true);

  return v_tenant_id;
end;
$$;
