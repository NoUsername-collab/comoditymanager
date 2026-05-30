-- ═══════════════════════════════════════════════════════════════════════
-- Atomic confirm_booking_with_rooms
--
-- Wraps the DELETE → INSERT → UPDATE → segment-sync sequence in a single
-- transaction so a mid-flight crash can never leave a booking without
-- room assignments.
-- ═══════════════════════════════════════════════════════════════════════

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
  v_check_in  date;
  v_check_out date;
  v_status    text;
  v_rid       uuid;
  v_rate      numeric;
  v_seg_count int;
  v_br_count  int;
  v_has_split boolean := false;
begin
  -- ── 0. Validate input ───────────────────────────────────────────────
  if p_total_price is null or p_total_price <= 0 then
    raise exception 'booking.total_price_required_on_confirm';
  end if;

  -- ── 1. Fetch booking & guard ────────────────────────────────────────
  select check_in, check_out, status
    into v_check_in, v_check_out, v_status
    from bookings
   where id = p_booking_id;

  if not found then
    raise exception 'booking.request_not_found';
  end if;

  if v_status = 'anulata' then
    raise exception 'booking.request_cancelled';
  end if;

  if v_status = 'confirmata' then
    raise exception 'booking.already_confirmed';
  end if;

  -- ── 2. Replace booking_rooms (atomic) ───────────────────────────────
  delete from booking_rooms where booking_id = p_booking_id;

  insert into booking_rooms (booking_id, room_id, extra_beds)
  select p_booking_id, unnest(p_room_ids), 0;

  -- ── 3. Update booking status ────────────────────────────────────────
  update bookings
     set status       = 'confirmata',
         total_price  = p_total_price,
         confirmed_at = now()
   where id = p_booking_id;

  -- ── 4. Sync booking_room_segments ───────────────────────────────────
  --    Mirrors the logic in syncBookingRoomSegments (TypeScript):
  --    • skip if booking has "split" segments (manual room-move edits)
  --    • otherwise: delete old segments, insert one per room

  -- Check for split segments
  select count(*) into v_seg_count
    from booking_room_segments
   where booking_id = p_booking_id;

  if v_seg_count > 1 then
    -- More segments than rooms → split
    select count(*) into v_br_count
      from booking_rooms
     where booking_id = p_booking_id;

    if v_seg_count > v_br_count then
      v_has_split := true;
    else
      -- Check for segments with non-standard dates or duplicate rooms
      if exists (
        select 1 from booking_room_segments
         where booking_id = p_booking_id
           and (segment_start <> v_check_in or segment_end <> v_check_out)
      ) then
        v_has_split := true;
      else
        -- Check for duplicate room_ids in segments
        if (
          select count(distinct room_id)
            from booking_room_segments
           where booking_id = p_booking_id
        ) < v_seg_count then
          v_has_split := true;
        end if;
      end if;
    end if;
  end if;

  if not v_has_split then
    delete from booking_room_segments where booking_id = p_booking_id;

    foreach v_rid in array p_room_ids loop
      select price_per_night into v_rate
        from rooms
       where id = v_rid;

      if not found then
        raise exception 'room.not_found';
      end if;

      insert into booking_room_segments
        (booking_id, room_id, segment_start, segment_end, nightly_rate)
      values
        (p_booking_id, v_rid, v_check_in, v_check_out, v_rate);
    end loop;
  end if;
end;
$$;

comment on function public.confirm_booking_with_rooms(uuid, uuid[], numeric) is
  'Atomically confirm a booking: replace room assignments, set status to confirmata, and sync segments in a single transaction.';
