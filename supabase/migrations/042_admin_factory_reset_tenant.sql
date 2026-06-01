-- 042 — Factory reset scoped to one tenant (multi-tenant safe)

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

  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'tenant not found: %', p_tenant_id;
  end if;

  select display_name into v_display_name
  from public.tenants
  where id = p_tenant_id;

  delete from public.admin_activity_log
  where tenant_id = p_tenant_id;

  delete from public.room_holds where tenant_id = p_tenant_id;
  delete from public.room_blocks where tenant_id = p_tenant_id;
  delete from public.booking_room_segments
  where tenant_id = p_tenant_id;
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
    admin_palette_key = 'default',
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
      'default',
      'night'
    );
  end if;
end;
$$;

comment on function public.admin_factory_reset_for_tenant(uuid) is
  'Wipes operational data for a single tenant. Does not touch other tenants or Auth users.';

revoke all on function public.admin_factory_reset_for_tenant(uuid)
  from public, anon, authenticated;

grant execute on function public.admin_factory_reset_for_tenant(uuid)
  to service_role;

-- Legacy global reset: disable for app callers (keep for emergency DBA only)
revoke execute on function public.admin_factory_reset() from service_role;
