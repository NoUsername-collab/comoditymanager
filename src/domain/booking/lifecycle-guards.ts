import type { BookingStatus } from "@/domain/booking/types";

type BookingStatusSlice = { status: BookingStatus };

/** Cereri active (neconfirmate, neanulate) — pot primi cameră provizorie. */
export function isBookingRoomAssignable(status: BookingStatus): boolean {
  return status === "cerere_noua";
}

/** Cereri noi sau anulate reacceptate — pot fi confirmate. */
export function isBookingConfirmable(status: BookingStatus): boolean {
  return status === "cerere_noua" || status === "anulata";
}

export function assertBookingRoomAssignable(
  booking: BookingStatusSlice | null | undefined,
): asserts booking is BookingStatusSlice {
  if (!booking) throw new Error("booking.request_not_found");
  if (booking.status === "anulata") throw new Error("booking.request_cancelled");
  if (booking.status === "confirmata") throw new Error("booking.already_confirmed");
  if (!isBookingRoomAssignable(booking.status)) {
    throw new Error("booking.request_not_found");
  }
}

export function assertBookingConfirmable(
  booking: BookingStatusSlice | null | undefined,
): asserts booking is BookingStatusSlice {
  if (!booking) throw new Error("booking.request_not_found");
  if (booking.status === "confirmata") throw new Error("booking.already_confirmed");
  if (!isBookingConfirmable(booking.status)) {
    throw new Error("booking.request_not_found");
  }
}
