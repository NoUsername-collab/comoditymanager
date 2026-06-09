import { listGuestProfileSummaries } from "@/services/guest-profiles";
import type { BookingStatus } from "@/domain/booking/types";
import type { BookingRow, BookingSelectRow } from "./types";

export function mapBookingRows(rows: BookingSelectRow[]): BookingRow[] {
  return rows.map((b) => {
    const room_ids: string[] = [];
    const room_names: string[] = [];

    for (const line of b.booking_rooms ?? []) {
      room_ids.push(line.room_id);
      const room = line.rooms;
      const name = Array.isArray(room) ? room[0]?.name : room?.name;
      if (name) room_names.push(name);
    }

    return {
      id: b.id,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status as BookingStatus,
      guest_name: b.guest_name,
      guest_last_name: b.guest_last_name ?? null,
      guest_first_name: b.guest_first_name ?? null,
      guest_email: b.guest_email ?? "",
      guest_phone: b.guest_phone ?? null,
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
      actual_check_in_at: b.actual_check_in_at ?? null,
      actual_check_out_at: b.actual_check_out_at ?? null,
      actual_check_in_by: b.actual_check_in_by ?? null,
      actual_check_out_by: b.actual_check_out_by ?? null,
    };
  });
}

export async function attachGuestProfiles(rows: BookingRow[]): Promise<BookingRow[]> {
  const guestIds = [
    ...new Set(rows.map((row) => row.guest_id).filter(Boolean) as string[]),
  ];
  if (guestIds.length === 0) return rows;

  const profiles = await listGuestProfileSummaries(guestIds);
  return rows.map((row) => ({
    ...row,
    guest_profile: row.guest_id ? profiles.get(row.guest_id) ?? null : null,
  }));
}

