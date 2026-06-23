import type { StoredPaymentStatus } from "@/domain/checkin/types";
import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestIdentityStatus,
} from "@/domain/guest/types";
import type { BookingStatus } from "@/domain/booking/types";

/** Normalized booking row used by Gantt, Cazări, calendar, and admin lists. */
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
  has_checkin_record?: boolean;
  checked_in_rooms?: string[];
  keys_handed_rooms?: string[];
  checkin_payment_status?: StoredPaymentStatus | null;
  room_id_verified?: string[];
  guest_identity_status?: GuestIdentityStatus | null;
};

/** Raw Supabase select shape before mapping to BookingRow. */
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
