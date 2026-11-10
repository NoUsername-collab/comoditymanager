/**
 * How a booking entered the system (bookings.source, migration 115):
 * - site: the guest sent it from the public site's booking form;
 * - staff: entered by staff in the calendar, or a duplicate / rebook of a stay;
 * - phone: entered by staff from the phone booking form;
 * - unknown: made before sources were recorded.
 */
export const BOOKING_SOURCES = ["site", "staff", "phone", "unknown"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** Sources a new booking can be created with; "unknown" belongs to old rows only. */
export type NewBookingSource = Exclude<BookingSource, "unknown">;
