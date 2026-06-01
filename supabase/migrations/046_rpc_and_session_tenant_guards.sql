-- 046 — RPC tenant guards + session bind RPC

-- ── Bind JWT app_metadata.tenant_id (staff on tenant host) ───────────────────

create or replace function public.bind_auth_tenant_for_host(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth.login_required';
  end if;

  if p_tenant_id is null then
    raise exception 'tenant_id required';
  end if;

  if not exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.status in ('active', 'trial')
  ) then
    raise exception 'tenant.not_found';
  end if;

  if not public.auth_user_is_active_member(p_tenant_id) then
    raise exception 'tenant.forbidden';
  end if;

  update auth.users
  set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('tenant_id', p_tenant_id::text),
    updated_at = now()
  where id = auth.uid();
end;
$$;

comment on function public.bind_auth_tenant_for_host(uuid) is
  'Sets app_metadata.tenant_id on auth.users for RLS (per tenant host session).';

grant execute on function public.bind_auth_tenant_for_host(uuid) to authenticated;

-- ── confirm_booking_with_rooms: optional tenant guard (app must pass) ───────

create or replace function public.confirm_booking_with_rooms(
  p_booking_id uuid,
  p_room_ids   uuid[],
  p_total_price numeric,
  p_tenant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check_in    date;
  v_check_out   date;
  v_status      text;
  v_tenant_id   uuid;
  v_rid         uuid;
  v_rate        numeric;
  v_seg_count   int;
  v_br_count    int;
  v_has_split   boolean := false;
  v_conflict_count int;
begin
  if p_total_price is null or p_total_price <= 0 then
    raise exception 'booking.total_price_required_on_confirm';
  end if;

  select check_in, check_out, status, tenant_id
    into v_check_in, v_check_out, v_status, v_tenant_id
    from public.bookings
   where id = p_booking_id;

  if not found then
    raise exception 'booking.request_not_found';
  end if;

  if p_tenant_id is not null and p_tenant_id is distinct from v_tenant_id then
    raise exception 'tenant.forbidden_cross_tenant';
  end if;

  if v_tenant_id is null then
    raise exception 'tenant.not_found_for_booking';
  end if;

  if v_status = 'confirmata' then
    raise exception 'booking.already_confirmed';
  end if;

  if v_status not in ('cerere_noua', 'anulata') then
    raise exception 'booking.request_not_found';
  end if;

  select count(*) into v_conflict_count
    from public.booking_room_segments brs
   where brs.tenant_id = v_tenant_id
     and brs.room_id = any(p_room_ids)
     and brs.is_active = true
     and brs.booking_id <> p_booking_id
     and daterange(brs.segment_start, brs.segment_end) &&
         daterange(v_check_in, v_check_out);

  if v_conflict_count > 0 then
    raise exception 'booking.rooms_no_longer_available_refresh_and_retry';
  end if;

  delete from public.booking_rooms
   where booking_id = p_booking_id
     and tenant_id = v_tenant_id;

  insert into public.booking_rooms (booking_id, room_id, extra_beds, tenant_id)
  select p_booking_id, unnest(p_room_ids), 0, v_tenant_id;

  update public.bookings
     set status       = 'confirmata',
         total_price  = p_total_price,
         confirmed_at = now()
   where id = p_booking_id
     and tenant_id = v_tenant_id;

  select count(*) into v_seg_count
    from public.booking_room_segments
   where booking_id = p_booking_id
     and tenant_id = v_tenant_id;

  if v_seg_count > 1 then
    select count(*) into v_br_count
      from public.booking_rooms
     where booking_id = p_booking_id
       and tenant_id = v_tenant_id;

    if v_seg_count > v_br_count then
      v_has_split := true;
    else
      if exists (
        select 1 from public.booking_room_segments
         where booking_id = p_booking_id
           and tenant_id = v_tenant_id
           and (segment_start <> v_check_in or segment_end <> v_check_out)
      ) then
        v_has_split := true;
      else
        if (
          select count(distinct room_id)
            from public.booking_room_segments
           where booking_id = p_booking_id
             and tenant_id = v_tenant_id
        ) < v_seg_count then
          v_has_split := true;
        end if;
      end if;
    end if;
  end if;

  if not v_has_split then
    delete from public.booking_room_segments
     where booking_id = p_booking_id
       and tenant_id = v_tenant_id;

    foreach v_rid in array p_room_ids loop
      select price_per_night into v_rate
        from public.rooms
       where id = v_rid
         and tenant_id = v_tenant_id;

      if not found then
        raise exception 'room.not_found';
      end if;

      insert into public.booking_room_segments (
        booking_id,
        room_id,
        segment_start,
        segment_end,
        nightly_rate,
        is_active,
        tenant_id
      )
      values (
        p_booking_id,
        v_rid,
        v_check_in,
        v_check_out,
        v_rate,
        true,
        v_tenant_id
      );
    end loop;
  end if;
end;
$$;

comment on function public.confirm_booking_with_rooms(uuid, uuid[], numeric, uuid) is
  'Atomic confirm; p_tenant_id must match booking when provided (cross-tenant guard).';

grant execute on function public.confirm_booking_with_rooms(uuid, uuid[], numeric, uuid)
  to service_role;

-- ── Factory reset: only service_role OR owner/admin on that tenant ──────────

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
