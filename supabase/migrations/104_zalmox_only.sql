-- 104 — Zalmox only: retire the Hospira and Nestio brands from the database.
--
-- * routing kind 'hospira_subdomain' becomes 'platform_subdomain'
-- * stored tenant subdomains on hospira.ro / nestio.ro move to zalmox.app
--   (staging: *.test.hospira.ro → *.test.zalmox.app)
-- * the tenant domain suffix setting points at Zalmox
-- * onboard_new_tenant writes 'platform_subdomain'; the unused 6-argument
--   overload left by migration 085 is dropped
--
-- Safe on production and staging: each project keeps its own suffix (test. or not).

begin;

-- 1. Routing kind ---------------------------------------------------------------
alter table public.tenant_domains
  drop constraint if exists tenant_domains_routing_kind_check;

update public.tenant_domains
set routing_kind = 'platform_subdomain'
where routing_kind = 'hospira_subdomain';

alter table public.tenant_domains
  alter column routing_kind set default 'platform_subdomain';

alter table public.tenant_domains
  add constraint tenant_domains_routing_kind_check
  check (
    routing_kind in (
      'platform_subdomain', -- slug.{platform}: full app (default)
      'custom_full',
      'custom_public',
      'custom_brand'
    )
  );

comment on column public.tenant_domains.routing_kind is
  'platform_subdomain | custom_full | custom_public | custom_brand';

-- 2. Stored subdomains -----------------------------------------------------------
-- Staging first, so "slug.test.hospira.ro" is not caught by the production rule.
update public.tenant_domains td
set domain = regexp_replace(td.domain, '\.test\.(hospira|nestio)\.ro$', '.test.zalmox.app')
where td.domain ~ '\.test\.(hospira|nestio)\.ro$'
  and not exists (
    select 1 from public.tenant_domains other
    where other.domain = regexp_replace(td.domain, '\.test\.(hospira|nestio)\.ro$', '.test.zalmox.app')
  );

update public.tenant_domains td
set domain = regexp_replace(td.domain, '\.(hospira|nestio)\.ro$', '.zalmox.app')
where td.domain ~ '\.(hospira|nestio)\.ro$'
  and not exists (
    select 1 from public.tenant_domains other
    where other.domain = regexp_replace(td.domain, '\.(hospira|nestio)\.ro$', '.zalmox.app')
  );

-- Rows whose Zalmox twin already existed are duplicates now.
delete from public.tenant_domains
where domain ~ '\.(hospira|nestio)\.ro$';

-- 3. Platform suffix --------------------------------------------------------------
update public.platform_settings
set value = 'test.zalmox.app'
where key = 'tenant_domain_suffix'
  and lower(value) in ('test.hospira.ro', 'test.nestio.ro', 'test.rezova.ro', 'test.zalmox.ro');

update public.platform_settings
set value = 'zalmox.app'
where key = 'tenant_domain_suffix'
  and lower(value) in ('hospira.ro', 'nestio.ro', 'rezova.ro', 'zalmox.ro');

-- 4. Tenant onboarding ------------------------------------------------------------
drop function if exists public.onboard_new_tenant(text, text, uuid, text, text, text, text);

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
  values (v_tenant_id, p_display_name, 'noir');

  insert into public.room_option_definitions (tenant_id, slug, name, price_per_night_addon, sort_order, is_system)
  values
    (v_tenant_id, 'ac',     'Aer condiționat', 0, 10, true),
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
    v_tenant_id, v_domain, 'platform_subdomain', true, now(), true
  );

  return v_tenant_id;
end;
$$;

commit;
