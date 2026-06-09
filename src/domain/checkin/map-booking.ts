import type { BookingForCheckin, CheckinGuestInput } from "./types";

type BookingLike = {
  id: string;
  status: string;
  total_price?: number | null;
  check_in: string;
  check_out: string;
  actual_check_in_at?: string | null;
  guest_name: string;
  guest_last_name?: string | null;
  guest_first_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  num_adults: number;
  num_children?: number | null;
  room_names?: string[];
  checked_in_rooms?: string[];
  guest_id?: string | null;
  registered_guests?: CheckinGuestInput[];
};

export function mapBookingToForCheckin(booking: BookingLike): BookingForCheckin {
  return {
    id: booking.id,
    status: booking.status,
    total_price: booking.total_price ?? 0,
    check_in: booking.check_in,
    check_out: booking.check_out,
    actual_check_in_at: booking.actual_check_in_at ?? null,
    guest_name: booking.guest_name,
    guest_last_name: booking.guest_last_name ?? null,
    guest_first_name: booking.guest_first_name ?? null,
    guest_phone: booking.guest_phone ?? null,
    guest_email: booking.guest_email ?? null,
    num_adults: booking.num_adults,
    num_children: booking.num_children ?? 0,
    room_names: booking.room_names,
    checked_in_rooms: booking.checked_in_rooms,
    guest_id: booking.guest_id ?? null,
    registered_guests: booking.registered_guests,
  };
}
