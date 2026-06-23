import type { BookingStatus } from "@/domain/booking/types";
import { bookingRoomNames } from "@/domain/checkin/room-checkin-progress";
import type { PaymentStatus, StoredPaymentStatus } from "@/domain/checkin/types";
import type { BookingDetail, BookingRow } from "./types";

export type GanttCreateSyntheticInput = {
  id: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  roomName?: string;
  totalPrice?: number | null;
};

/** Build a Gantt BookingRow from known mutation inputs - no DB round-trip. */
export function buildSyntheticGanttBookingRow(
  input: GanttCreateSyntheticInput,
): BookingRow {
  const roomName = input.roomName?.trim() ?? "";
  return {
    id: input.id,
    check_in: input.checkIn,
    check_out: input.checkOut,
    status: input.status,
    guest_name: `${input.guestLastName} ${input.guestFirstName}`.trim(),
    guest_last_name: input.guestLastName,
    guest_first_name: input.guestFirstName,
    guest_email: input.guestEmail,
    guest_phone: input.guestPhone,
    guest_id: null,
    guest_alert_level: "normal",
    guest_alert_note: null,
    guest_profile: null,
    num_adults: 1,
    num_children: 0,
    room_ids: [input.roomId],
    room_names: roomName ? [roomName] : [],
    total_price: input.totalPrice ?? null,
    actual_check_in_at: null,
    actual_check_out_at: null,
    actual_check_in_by: null,
    actual_check_out_by: null,
  };
}

export type CheckinPatchInput = {
  checkedInAt: string;
  checkedInRooms?: string[];
  keysHandedRooms?: string[];
  paymentStatus?: PaymentStatus;
};

/** Patch an already-loaded booking row with check-in state for Gantt optimistic update. */
export function patchBookingRowForCheckin(
  booking: BookingDetail,
  patch: CheckinPatchInput,
): BookingRow {
  const rooms = bookingRoomNames(booking.room_names);
  let checked_in_rooms = patch.checkedInRooms ?? [];
  if (checked_in_rooms.length === 0 && rooms.length === 1) {
    checked_in_rooms = [rooms[0]];
  }

  return {
    id: booking.id,
    check_in: booking.check_in,
    check_out: booking.check_out,
    status: booking.status,
    guest_name: booking.guest_name,
    guest_last_name: booking.guest_last_name,
    guest_first_name: booking.guest_first_name,
    guest_email: booking.guest_email,
    guest_phone: booking.guest_phone,
    guest_id: booking.guest_id,
    guest_alert_level: booking.guest_alert_level,
    guest_alert_note: booking.guest_alert_note,
    guest_profile: booking.guest_profile,
    num_adults: booking.num_adults,
    num_children: booking.num_children,
    room_ids: booking.room_ids,
    room_names: booking.room_names,
    total_price: booking.total_price,
    actual_check_in_at: booking.actual_check_in_at ?? patch.checkedInAt,
    actual_check_out_at: booking.actual_check_out_at,
    actual_check_in_by: booking.actual_check_in_by,
    actual_check_out_by: booking.actual_check_out_by,
    has_checkin_record: true,
    checked_in_rooms,
    keys_handed_rooms: patch.keysHandedRooms ?? [],
    checkin_payment_status:
      (patch.paymentStatus as StoredPaymentStatus | undefined) ?? null,
    room_id_verified: [],
    guest_identity_status: null,
  };
}