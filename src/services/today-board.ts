import { createAdminClient } from "@/lib/supabase/admin";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import type { GuestFlagLevel } from "@/domain/guest/types";
import type { BookingRow } from "@/services/bookings";
import { todayIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";

export type RoomToClean = {
  room_id: string;
  room_name: string;
  building_name: string;
  guest_name: string;
  booking_id: string;
  check_out: string;
};

export type TodayBoard = {
  todayIso: string;
  checkInTime: string;
  checkOutTime: string;
  cleaningWindowLabel: string;
  arrivals: BookingRow[];
  departures: BookingRow[];
  roomsToClean: RoomToClean[];
};

function mapBookingRow(b: {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: string | null;
  guest_alert_level?: GuestFlagLevel;
  guest_alert_note?: string | null;
  num_adults: number;
  num_children: number;
  total_price: number | null;
  booking_rooms: {
    room_id: string;
    rooms: { name: string; building_name?: string } | { name: string }[] | null;
  }[];
}): BookingRow {
  const room_ids: string[] = [];
  const room_names: string[] = [];
  for (const line of b.booking_rooms ?? []) {
    room_ids.push(line.room_id);
    const r = line.rooms;
    const room = Array.isArray(r) ? r[0] : r;
    if (room?.name) room_names.push(room.name);
  }
  return {
    id: b.id,
    check_in: b.check_in,
    check_out: b.check_out,
    status: b.status as BookingRow["status"],
    guest_name: b.guest_name,
    guest_last_name: b.guest_last_name ?? null,
    guest_first_name: b.guest_first_name ?? null,
    guest_email: b.guest_email,
    guest_phone: b.guest_phone,
    guest_id: b.guest_id ?? null,
    guest_alert_level:
      b.guest_alert_level === "watchlist" || b.guest_alert_level === "blacklist"
        ? b.guest_alert_level
        : "normal",
    guest_alert_note: b.guest_alert_note ?? null,
    guest_profile: null,
    num_adults: b.num_adults,
    num_children: b.num_children,
    room_ids,
    room_names,
    total_price: b.total_price != null ? Number(b.total_price) : null,
    actual_check_in_at: null,
    actual_check_out_at: null,
    actual_check_in_by: null,
    actual_check_out_by: null,
  };
}

export async function loadTodayBoard(
  checkInTime: string,
  checkOutTime: string
): Promise<TodayBoard> {
  const today = await getEffectiveToday();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
      num_adults, num_children, total_price,
      booking_rooms (
        room_id,
        rooms ( name, buildings ( name ) )
      )
    `
    )
    .eq("status", "confirmata")
    .or(`check_in.eq.${today},check_out.eq.${today}`)
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  const arrivals: BookingRow[] = [];
  const departures: BookingRow[] = [];
  const roomsToClean: RoomToClean[] = [];
  const seenClean = new Set<string>();

  for (const raw of data ?? []) {
    const br = (raw.booking_rooms ?? []) as {
      room_id: string;
      rooms:
        | { name: string; buildings: { name: string } | { name: string }[] | null }
        | { name: string; buildings: { name: string } | { name: string }[] | null }[]
        | null;
    }[];

    const row = mapBookingRow({
      ...raw,
      booking_rooms: br.map((line) => {
        const r = line.rooms;
        const room = Array.isArray(r) ? r[0] : r;
        const bld = room?.buildings;
        const building_name = Array.isArray(bld)
          ? bld[0]?.name
          : bld?.name ?? "";
        return {
          room_id: line.room_id,
          rooms: room
            ? { name: room.name, building_name }
            : null,
        };
      }),
    });

    if (raw.check_in === today) arrivals.push(row);
    if (raw.check_out === today) {
      departures.push(row);
      const guestLabel = formatGuestGanttLabel(
        raw.guest_last_name,
        raw.guest_first_name,
        raw.guest_name
      );
      for (const line of br) {
        const key = line.room_id;
        if (seenClean.has(key)) continue;
        seenClean.add(key);
        const r = line.rooms;
        const room = Array.isArray(r) ? r[0] : r;
        const bld = room?.buildings;
        const building_name = Array.isArray(bld)
          ? bld[0]?.name ?? ""
          : bld?.name ?? "";
        roomsToClean.push({
          room_id: line.room_id,
          room_name: room?.name ?? "Room",
          building_name,
          guest_name: guestLabel,
          booking_id: raw.id,
          check_out: raw.check_out,
        });
      }
    }
  }

  return {
    todayIso: today,
    checkInTime,
    checkOutTime,
    cleaningWindowLabel: `Cleaning after check-out ${checkOutTime} until check-in ${checkInTime}`,
    arrivals,
    departures,
    roomsToClean,
  };
}
