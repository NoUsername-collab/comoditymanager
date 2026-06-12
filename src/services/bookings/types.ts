import type { StoredPaymentStatus } from "@/domain/checkin/types";
import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestIdentityStatus,
} from "@/domain/guest/types";
import type { BookingStatus } from "@/domain/booking/types";

export const BOOKING_ROW_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, total_price,
  actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
  booking_rooms ( room_id, rooms ( name ) )
`;

/** Lighter select for full cereri queue list — no room join or operational columns. */
export const CERERE_LIST_PAGE_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children
`;

export const BOOKING_ROW_WITH_UPDATED_SELECT = `
  ${BOOKING_ROW_SELECT.trim()},
  updated_at
`;

export type BookingRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: string | null;
  guest_alert_level: GuestFlagLevel;
  guest_alert_note: string | null;
  guest_profile: GuestBookingFlagSummary | null;
  num_adults: number;
  num_children: number;
  room_ids: string[];
  room_names: string[];
  total_price: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  actual_check_in_by: string | null;
  actual_check_out_by: string | null;
  /** Rând în checkins (wizard) — poate exista înainte de actual_check_in_at reparat. */
  has_checkin_record?: boolean;
  /** Camere deja recepționate (distinct room_label din checkin_guests). */
  checked_in_rooms?: string[];
  /** Camere pentru care s-a confirmat înmânarea cheii (toate sesiunile). */
  keys_handed_rooms?: string[];
  /** Ultima înregistrare check-in — plată. */
  checkin_payment_status?: StoredPaymentStatus | null;
  /** Status identitate din profilul oaspete. */
  guest_identity_status?: GuestIdentityStatus | null;
};

export type BookingSelectRow = {
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
  guest_alert_level: GuestFlagLevel;
  guest_alert_note: string | null;
  num_adults: number;
  num_children: number;
  total_price: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  actual_check_in_by: string | null;
  actual_check_out_by: string | null;
  booking_rooms:
    | {
        room_id: string;
        rooms: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

export type BookingDetail = BookingRow & {
  has_minor: boolean;
  minor_age: string | null;
  notes: string | null;
  total_price: number | null;
};

export type OperationalStayRow = BookingRow;
export type CompletedStayHistoryRow = BookingRow;
export type CancelledStayHistoryRow = BookingRow & { updated_at: string };
