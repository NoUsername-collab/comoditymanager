import type { BookingStatus } from "@/domain/booking/types";

/** Rezervări care încă „țin” camera (ștergere cameră / clădire). */
export const ROOM_LOCKING_BOOKING_STATUSES: BookingStatus[] = [
  "cerere_noua",
  "confirmata",
];
