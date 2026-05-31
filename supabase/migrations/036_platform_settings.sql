-- 036 — Platform domain config (per Supabase project, not per tenant)

create table if not exists public.platform_settings (
  key text primary key,
  value text not null
);

insert into public.platform_settings (key, value)
values ('tenant_domain_suffix', 'hospira.ro')
on conflict (key) do nothing;

comment on table public.platform_settings is
  'Per-project config. Staging: UPDATE tenant_domain_suffix to test.hospira.ro once.';

-- Require platform domain: from signup RPC param, else platform_settings fallback
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
    raise exception 'platform domain not configured (pass p_platform_domain or set platform_settings.tenant_domain_suffix)';
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

-- Ensure every existing tenant has a domain row for the configured suffix (any slug, not hardcoded)
insert into public.tenant_domains (tenant_id, domain, verified, verified_at, ssl_active)
select
  t.id,
  t.slug || '.' || ps.value,
  true,
  now(),
  true
from public.tenants t
cross join public.platform_settings ps
where ps.key = 'tenant_domain_suffix'
  and not exists (
    select 1
    from public.tenant_domains td
    where td.tenant_id = t.id
      and td.domain = t.slug || '.' || ps.value
  );
