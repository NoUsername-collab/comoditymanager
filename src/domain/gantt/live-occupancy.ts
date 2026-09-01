import type { BookingRow } from "@/domain/booking/row";
import { occupancyPhase } from "@/domain/occupancy/phase";
import type { OccupancyKind, OccupancySegment } from "@/domain/occupancy/types";

export function bookingOccupancyKey(booking: {
  status: string;
  check_in: string;
  check_out: string;
  room_ids: string[];
}): string {
  return [
    booking.status,
    booking.check_in,
    booking.check_out,
    [...booking.room_ids].sort().join(","),
  ].join("|");
}

export function overlayChangesOccupancy(
  overlay: BookingRow,
  server: BookingRow | undefined,
): boolean {
  if (!server) return true;
  return bookingOccupancyKey(overlay) !== bookingOccupancyKey(server);
}

export function occupancySegmentsFromBooking(
  booking: BookingRow,
  today: string,
): OccupancySegment[] {
  const kind: OccupancyKind =
    booking.status === "confirmata" ? "stay" : "request";
  return booking.room_ids.filter(Boolean).map((roomId) => ({
    id: `live:${booking.id}:${roomId}`,
    kind,
    roomId,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    phase: occupancyPhase(booking.check_in, booking.check_out, today),
    bookingId: booking.id,
    bookingStatus: booking.status,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
  }));
}

export function remapBookingRoom(
  booking: BookingRow,
  sourceRoomId: string,
  targetRoomId: string,
  targetRoomName: string,
): BookingRow {
  const room_ids = booking.room_ids.map((id) =>
    id === sourceRoomId ? targetRoomId : id,
  );
  const room_names = booking.room_ids.map((id, index) =>
    id === sourceRoomId ? targetRoomName : (booking.room_names[index] ?? ""),
  );
  return { ...booking, room_ids, room_names };
}

export function mergeGanttLiveBookings(
  serverBookings: BookingRow[],
  overlays: Map<string, BookingRow>,
  removedIds: Set<string>,
): BookingRow[] {
  const filtered = serverBookings.filter((booking) => !removedIds.has(booking.id));
  if (overlays.size === 0) return filtered;
  const merged = filtered.map((booking) => overlays.get(booking.id) ?? booking);
  for (const [id, row] of overlays) {
    if (!removedIds.has(id) && !serverBookings.some((booking) => booking.id === id)) {
      merged.push(row);
    }
  }
  return merged;
}

export function mergeGanttLiveOccupancy(input: {
  serverOccupancy: OccupancySegment[];
  serverBookings: BookingRow[];
  overlays: Map<string, BookingRow>;
  removedBookingIds: Set<string>;
  extraSegments: OccupancySegment[];
  removedSegmentIds: Set<string>;
  today: string;
}): OccupancySegment[] {
  const serverById = new Map(
    input.serverBookings.map((booking) => [booking.id, booking]),
  );
  const replaceBookingIds = new Set<string>();
  for (const [id, overlay] of input.overlays) {
    if (overlayChangesOccupancy(overlay, serverById.get(id))) {
      replaceBookingIds.add(id);
    }
  }

  const merged = input.serverOccupancy.filter((segment) => {
    if (input.removedSegmentIds.has(segment.id)) return false;
    if (segment.bookingId && input.removedBookingIds.has(segment.bookingId)) {
      return false;
    }
    if (segment.bookingId && replaceBookingIds.has(segment.bookingId)) {
      return false;
    }
    return true;
  });

  for (const bookingId of replaceBookingIds) {
    const overlay = input.overlays.get(bookingId);
    if (!overlay) continue;
    merged.push(...occupancySegmentsFromBooking(overlay, input.today));
  }

  const seen = new Set(merged.map((segment) => segment.id));
  for (const extra of input.extraSegments) {
    if (input.removedSegmentIds.has(extra.id) || seen.has(extra.id)) continue;
    seen.add(extra.id);
    merged.push(extra);
  }

  return merged;
}
