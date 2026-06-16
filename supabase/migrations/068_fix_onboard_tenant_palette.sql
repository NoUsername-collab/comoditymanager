-- Fix admin_palette_key CHECK constraint to match current app theme IDs.
--
-- History: migration 008 added admin_palette_key with default 'pension'.
-- Migration 011 changed default to 'default' and added CHECK for
-- ('default','win95','winxp'). Migration 014 expanded with country themes.
-- The app now uses theme IDs: 'noir' (was 'default'), 'alpine', 'mediterranean'.
-- Writing any of these to the DB violates the old CHECK constraint.

-- 1. Drop old CHECK constraint first (it blocks writing new theme IDs)
alter table public.pension_settings
  drop constraint if exists pension_settings_admin_palette_key_check;

-- 2. Migrate existing rows to new theme IDs
update public.pension_settings
set admin_palette_key = 'noir'
where admin_palette_key not in ('noir', 'alpine', 'mediterranean');

-- 3. Add new CHECK constraint with current theme IDs
alter table public.pension_settings
  add constraint pension_settings_admin_palette_key_check
  check (admin_palette_key in ('noir', 'alpine', 'mediterranean'));

-- 4. Update column default
alter table public.pension_settings
  alter column admin_palette_key set default 'noir';

-- 4. Redefine onboard_new_tenant to use new default
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

-- 5. Redefine admin_factory_reset_for_tenant to use new theme ID
create or replace function public.admin_factory_reset_for_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  if p_tenant_id is null then
    raise exception 'tenant_id required';
  end if;

  if not public.is_service_role() then
    if auth.uid() is null or not public.auth_user_is_active_member(p_tenant_id) then
      raise exception 'tenant.forbidden';
    end if;
    if public.auth_tenant_id() is distinct from p_tenant_id then
      raise exception 'tenant.forbidden';
    end if;
  end if;

  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'tenant not found: %', p_tenant_id;
  end if;

  select display_name into v_display_name
  from public.tenants
  where id = p_tenant_id;

  delete from public.admin_activity_log where tenant_id = p_tenant_id;
  delete from public.room_holds where tenant_id = p_tenant_id;
  delete from public.room_blocks where tenant_id = p_tenant_id;
  delete from public.booking_room_segments where tenant_id = p_tenant_id;
  delete from public.booking_rooms where tenant_id = p_tenant_id;
  delete from public.bookings where tenant_id = p_tenant_id;
  delete from public.guests where tenant_id = p_tenant_id;
  delete from public.rooms where tenant_id = p_tenant_id;
  delete from public.floors where tenant_id = p_tenant_id;
  delete from public.buildings where tenant_id = p_tenant_id;

  update public.pension_settings
  set
    display_name = coalesce(v_display_name, display_name),
    default_check_in_time = '14:00',
    default_check_out_time = '11:00',
    total_extra_beds_max = 2,
    admin_palette_source = 'catalog',
    admin_palette_key = 'noir',
    admin_day_night = 'night',
    updated_at = now()
  where tenant_id = p_tenant_id;

  if not found then
    insert into public.pension_settings (
      tenant_id,
      display_name,
      total_extra_beds_max,
      admin_palette_source,
      admin_palette_key,
      admin_day_night
    )
    values (
      p_tenant_id,
      coalesce(v_display_name, 'Pensiune'),
      2,
      'catalog',
      'noir',
      'night'
    );
  end if;
end;
$$;
