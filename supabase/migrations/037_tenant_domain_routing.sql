-- 037 — Domain routing modes (all variants at launch)

alter table public.tenant_domains
  add column if not exists routing_kind text not null default 'hospira_subdomain';

alter table public.tenant_domains
  drop constraint if exists tenant_domains_routing_kind_check;

alter table public.tenant_domains
  add constraint tenant_domains_routing_kind_check
  check (
    routing_kind in (
      'hospira_subdomain',  -- slug.{platform}: full app (default)
      'custom_full',        -- client domain: presentation + booking + admin
      'custom_public',      -- client domain: public only; admin on Hospira subdomain
      'custom_brand'        -- client domain: homepage only; booking on Hospira subdomain
    )
  );

comment on column public.tenant_domains.routing_kind is
  'hospira_subdomain | custom_full | custom_public | custom_brand';

-- Subdomain rows created at signup
update public.tenant_domains td
set routing_kind = 'hospira_subdomain'
where routing_kind is distinct from 'hospira_subdomain'
  and td.domain ~ '^[a-z0-9-]+\.(hospira\.ro|test\.hospira\.ro)$';

-- Return type adds routing_kind; CREATE OR REPLACE cannot alter OUT columns.
drop function if exists public.resolve_tenant_by_domain(text);

create or replace function public.resolve_tenant_by_domain(p_domain text)
returns table (
  tenant_id uuid,
  slug text,
  display_name text,
  plan_id text,
  active_modules text[],
  status text,
  locale text,
  country text,
  timezone text,
  routing_kind text
)
language sql
stable
security definer
as $$
  select
    t.id as tenant_id,
    t.slug,
    t.display_name,
    t.plan_id,
    t.active_modules,
    t.status,
    t.locale,
    t.country,
    t.timezone,
    td.routing_kind
  from public.tenants t
  inner join public.tenant_domains td on td.tenant_id = t.id
  where td.domain = lower(trim(p_domain))
    and td.verified = true
    and t.status in ('active', 'trial')
  limit 1;
$$;

create or replace function public.add_tenant_domain(
  p_tenant_id uuid,
  p_domain text,
  p_routing_kind text default 'custom_public'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_domain_id uuid;
  v_kind text;
begin
  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'Tenant not found: %', p_tenant_id;
  end if;

  v_kind := coalesce(nullif(trim(p_routing_kind), ''), 'custom_public');
  if v_kind not in ('custom_full', 'custom_public', 'custom_brand') then
    raise exception 'Invalid routing_kind: %', v_kind;
  end if;

  if exists (
    select 1 from public.tenant_domains
    where domain = lower(trim(p_domain))
  ) then
    raise exception 'Domain already registered: %', p_domain;
  end if;

  insert into public.tenant_domains (tenant_id, domain, routing_kind, verified)
  values (p_tenant_id, lower(trim(p_domain)), v_kind, false)
  returning id into v_domain_id;

  return v_domain_id;
end;
$$;

-- onboard: mark Hospira subdomain row
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

  insert into public.tenant_domains (
    tenant_id, domain, routing_kind, verified, verified_at, ssl_active
  )
  values (
    v_tenant_id, v_domain, 'hospira_subdomain', true, now(), true
  );

  return v_tenant_id;
end;
$$;
