-- 040 — confirm_booking_with_rooms must set tenant_id (multi-tenant NOT NULL)

create or replace function public.confirm_booking_with_rooms(
  p_booking_id uuid,
  p_room_ids   uuid[],
  p_total_price numeric
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

  if v_tenant_id is null then
    raise exception 'tenant.not_found_for_booking';
  end if;

  if v_status = 'anulata' then
    raise exception 'booking.request_cancelled';
  end if;

  if v_status = 'confirmata' then
    raise exception 'booking.already_confirmed';
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

comment on function public.confirm_booking_with_rooms(uuid, uuid[], numeric) is
  'Atomic confirm: assigns rooms + segments with tenant_id from parent booking.';
