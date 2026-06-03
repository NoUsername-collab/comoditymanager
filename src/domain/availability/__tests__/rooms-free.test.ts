import { describe, it, expect } from "vitest";
import {
  isRoomFreeForStay,
  countFreeRooms,
  type ExistingBooking,
  type RoomForAvailability,
} from "@/domain/availability/rooms-free";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBooking(
  room_id: string,
  check_in: string,
  check_out: string
): ExistingBooking {
  return { room_id, check_in, check_out };
}

function makeRoom(id: string): RoomForAvailability {
  return {
    id,
    name: `Room ${id}`,
    building_name: "Main",
    capacity_base: 2,
    has_ac: false,
    allows_extra_beds: false,
  };
}

// ---------------------------------------------------------------------------
// isRoomFreeForStay
// ---------------------------------------------------------------------------

describe("isRoomFreeForStay", () => {
  it("returns true when there are no bookings", () => {
    expect(
      isRoomFreeForStay("r1", "2026-07-10", "2026-07-13", [])
    ).toBe(true);
  });

  it("returns true when existing booking does not overlap", () => {
    const bookings = [makeBooking("r1", "2026-07-01", "2026-07-05")];
    expect(
      isRoomFreeForStay("r1", "2026-07-10", "2026-07-13", bookings)
    ).toBe(true);
  });

  it("returns false when an existing booking overlaps the proposed stay", () => {
    const bookings = [makeBooking("r1", "2026-07-11", "2026-07-15")];
    expect(
      isRoomFreeForStay("r1", "2026-07-10", "2026-07-13", bookings)
    ).toBe(false);
  });

  it("returns true when overlapping booking is for a different room", () => {
    const bookings = [makeBooking("r2", "2026-07-10", "2026-07-15")];
    expect(
      isRoomFreeForStay("r1", "2026-07-10", "2026-07-13", bookings)
    ).toBe(true);
  });

  it("returns true for same-day turnover (checkout == checkin)", () => {
    // Default times: check-out 11:00, check-in 14:00 => no overlap
    const bookings = [makeBooking("r1", "2026-07-08", "2026-07-10")];
    expect(
      isRoomFreeForStay("r1", "2026-07-10", "2026-07-13", bookings)
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// countFreeRooms
// ---------------------------------------------------------------------------

describe("countFreeRooms", () => {
  const rooms: RoomForAvailability[] = [
    makeRoom("r1"),
    makeRoom("r2"),
    makeRoom("r3"),
  ];

  it("returns total count when no bookings exist", () => {
    expect(
      countFreeRooms(rooms, "2026-07-10", "2026-07-13", [])
    ).toBe(3);
  });

  it("returns correct count when some rooms are booked", () => {
    const bookings = [
      makeBooking("r1", "2026-07-10", "2026-07-15"),
      makeBooking("r3", "2026-07-11", "2026-07-14"),
    ];
    expect(
      countFreeRooms(rooms, "2026-07-10", "2026-07-13", bookings)
    ).toBe(1);
  });

  it("returns 0 for a zero-night stay (checkIn == checkOut)", () => {
    expect(
      countFreeRooms(rooms, "2026-07-10", "2026-07-10", [])
    ).toBe(0);
  });

  it("returns 0 when rooms array is empty", () => {
    expect(
      countFreeRooms([], "2026-07-10", "2026-07-13", [])
    ).toBe(0);
  });
});
