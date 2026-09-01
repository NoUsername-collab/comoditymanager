import { describe, expect, it } from "vitest";
import type { BookingRow } from "@/domain/booking/row";
import type { OccupancySegment } from "@/domain/occupancy/types";
import {
  bookingOccupancyKey,
  mergeGanttLiveBookings,
  mergeGanttLiveOccupancy,
  occupancySegmentsFromBooking,
  overlayChangesOccupancy,
  remapBookingRoom,
} from "@/domain/gantt/live-occupancy";

function booking(partial: Partial<BookingRow> & Pick<BookingRow, "id">): BookingRow {
  return {
    check_in: "2026-09-10",
    check_out: "2026-09-12",
    status: "cerere_noua",
    guest_name: "Ion Pop",
    guest_last_name: "Pop",
    guest_first_name: "Ion",
    guest_email: "ion@test.ro",
    guest_phone: "0700000000",
    guest_id: null,
    guest_alert_level: "normal",
    guest_alert_note: null,
    guest_profile: null,
    num_adults: 1,
    num_children: 0,
    room_ids: ["room-a"],
    room_names: ["101"],
    total_price: null,
    actual_check_in_at: null,
    actual_check_out_at: null,
    actual_check_in_by: null,
    actual_check_out_by: null,
    ...partial,
  };
}

function staySeg(partial: Partial<OccupancySegment> & Pick<OccupancySegment, "id">): OccupancySegment {
  return {
    kind: "request",
    roomId: "room-a",
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
    phase: "future",
    bookingId: "b1",
    ...partial,
  };
}

describe("gantt live occupancy", () => {
  it("keeps a newly created overlay when the server refresh is stale", () => {
    const overlay = booking({ id: "new-1" });
    const overlays = new Map([[overlay.id, overlay]]);
    const merged = mergeGanttLiveBookings([], overlays, new Set());
    expect(merged.map((row) => row.id)).toEqual(["new-1"]);
  });

  it("does not drop an overlay just because server data has not caught up", () => {
    const overlay = booking({ id: "b1", status: "confirmata" });
    const overlays = new Map([["b1", overlay]]);
    const next = mergeGanttLiveOccupancy({
      serverOccupancy: [staySeg({ id: "seg-1", bookingId: "b1", kind: "request" })],
      serverBookings: [booking({ id: "b1" })],
      overlays,
      removedBookingIds: new Set(),
      extraSegments: [],
      removedSegmentIds: new Set(),
      today: "2026-09-01",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("stay");
    expect(next[0]?.bookingId).toBe("b1");
  });

  it("moves a stay to the target room from the overlay", () => {
    const moved = remapBookingRoom(
      booking({ id: "b1", room_ids: ["room-a"], room_names: ["101"] }),
      "room-a",
      "room-b",
      "102",
    );
    expect(moved.room_ids).toEqual(["room-b"]);
    expect(moved.room_names).toEqual(["102"]);
    const occupancy = mergeGanttLiveOccupancy({
      serverOccupancy: [staySeg({ id: "seg-1", bookingId: "b1", roomId: "room-a" })],
      serverBookings: [booking({ id: "b1" })],
      overlays: new Map([["b1", moved]]),
      removedBookingIds: new Set(),
      extraSegments: [],
      removedSegmentIds: new Set(),
      today: "2026-09-01",
    });
    expect(occupancy).toHaveLength(1);
    expect(occupancy[0]?.roomId).toBe("room-b");
  });

  it("leaves occupancy in place for check-in-only patches", () => {
    const server = booking({ id: "b1", status: "confirmata" });
    const overlay = { ...server, actual_check_in_at: "2026-09-10T14:00:00.000Z" };
    expect(overlayChangesOccupancy(overlay, server)).toBe(false);
    expect(bookingOccupancyKey(overlay)).toBe(bookingOccupancyKey(server));
    const occupancy = mergeGanttLiveOccupancy({
      serverOccupancy: [
        staySeg({ id: "seg-1", bookingId: "b1", kind: "stay", roomId: "room-a" }),
      ],
      serverBookings: [server],
      overlays: new Map([["b1", overlay]]),
      removedBookingIds: new Set(),
      extraSegments: [],
      removedSegmentIds: new Set(),
      today: "2026-09-01",
    });
    expect(occupancy[0]?.id).toBe("seg-1");
  });

  it("adds a created booking as occupancy when the server list is still empty", () => {
    const overlay = booking({ id: "new-1" });
    const occupancy = mergeGanttLiveOccupancy({
      serverOccupancy: [],
      serverBookings: [],
      overlays: new Map([[overlay.id, overlay]]),
      removedBookingIds: new Set(),
      extraSegments: [],
      removedSegmentIds: new Set(),
      today: "2026-09-01",
    });
    expect(occupancyFromIds(occupancy)).toEqual(["live:new-1:room-a"]);
    expect(occupancySegmentsFromBooking(overlay, "2026-09-01")[0]?.kind).toBe(
      "request",
    );
  });

  it("keeps a hold overlay when the server refresh has not caught up", () => {
    const hold: OccupancySegment = {
      id: "hold-1",
      kind: "hold",
      roomId: "room-a",
      checkIn: "2026-09-10",
      checkOut: "2026-09-11",
      phase: "future",
      reason: "telefon",
    };
    const occupancy = mergeGanttLiveOccupancy({
      serverOccupancy: [],
      serverBookings: [],
      overlays: new Map(),
      removedBookingIds: new Set(),
      extraSegments: [hold],
      removedSegmentIds: new Set(),
      today: "2026-09-01",
    });
    expect(occupancy).toEqual([hold]);
  });
});

function occupancyFromIds(segments: OccupancySegment[]): string[] {
  return segments.map((segment) => segment.id);
}
