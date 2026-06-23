export type {
  BookingRow,
  BookingSelectRow,
  BookingDetail,
  OperationalStayRow,
  CompletedStayHistoryRow,
  CancelledStayHistoryRow,
} from "@/domain/booking/row";

export const BOOKING_ROW_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, total_price,
  actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
  booking_rooms ( room_id, rooms ( name ) )
`;

/** Cazări operational lists — omits audit actor columns. */
export const CAZARI_LIST_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, total_price,
  actual_check_in_at, actual_check_out_at,
  booking_rooms ( room_id, rooms ( name ) )
`;

/** Trimmed select for Gantt range queries — omits email and audit actor columns. */
export const GANTT_BOOKING_ROW_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, total_price,
  actual_check_in_at, actual_check_out_at,
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
