import type { BookingStatus } from "@/domain/booking/types";

/** Tip ocupare pe timeline — spec timeline-spec.md */
export type OccupancyKind = "hold" | "request" | "stay" | "block";

/** Fază temporală calculată */
export type OccupancyPhase = "past" | "active" | "future";

export type OccupancySegment = {
  /** id segment (booking_room_segments | room_holds | room_blocks) */
  id: string;
  kind: OccupancyKind;
  roomId: string;
  checkIn: string;
  checkOut: string;
  phase: OccupancyPhase;

  bookingId?: string;
  bookingStatus?: BookingStatus;
  guestName?: string | null;
  guestEmail?: string | null;

  reason?: string | null;
  expiresAt?: string | null;
  releasedAt?: string | null;
};

export type OccupancyQueryOptions = {
  /** Filtru kind; default toate */
  kinds?: OccupancyKind[];
  /** Exclude segmentele unui booking (la realloc) */
  excludeBookingId?: string;
  /** Pentru calendar public: fără hold/request nealocate */
  forPublicCalendar?: boolean;
  /** Data referință pentru fază (default azi local) */
  referenceDate?: string;
};

export type OccupancyConflict = {
  segment: OccupancySegment;
  roomId: string;
};
