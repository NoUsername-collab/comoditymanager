import { describe, it, expect } from "vitest";
import {
  roomMaxCapacity,
  minRoomsToHostGuests,
  totalCapacityOfRooms,
  canRoomsHostGuests,
  type RoomCapacity,
} from "@/domain/availability/stay-capacity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function room(base: number, extras: number, allowed = true): RoomCapacity {
  return {
    capacity_base: base,
    allows_extra_beds: allowed,
    max_extra_beds_per_room: extras,
  };
}

// ---------------------------------------------------------------------------
// roomMaxCapacity
// ---------------------------------------------------------------------------

describe("roomMaxCapacity", () => {
  it("returns capacity_base when extra beds are not allowed", () => {
    expect(roomMaxCapacity(room(3, 2, false))).toBe(3);
  });

  it("returns base + max_extra_beds when extra beds are allowed", () => {
    expect(roomMaxCapacity(room(2, 3, true))).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// minRoomsToHostGuests
// ---------------------------------------------------------------------------

describe("minRoomsToHostGuests", () => {
  it("returns possible=true, minRooms=0 for 0 guests", () => {
    const result = minRoomsToHostGuests(0, [room(4, 0, false)]);
    expect(result).toEqual({ possible: true, minRooms: 0 });
  });

  it("returns minRooms=1 when guests fit in the largest room", () => {
    const rooms = [room(2, 1), room(4, 2)];
    const result = minRoomsToHostGuests(5, rooms);
    expect(result).toEqual({ possible: true, minRooms: 1 });
  });

  it("returns minRooms=2 when guests need two rooms", () => {
    const rooms = [room(2, 0, false), room(3, 0, false)];
    const result = minRoomsToHostGuests(5, rooms);
    expect(result).toEqual({ possible: true, minRooms: 2 });
  });

  it("returns possible=false when guests exceed total capacity", () => {
    const rooms = [room(2, 0, false), room(2, 0, false)];
    const result = minRoomsToHostGuests(10, rooms);
    expect(result).toEqual({ possible: false, minRooms: 2 });
  });

  it("returns possible=false for >0 guests with empty rooms array", () => {
    const result = minRoomsToHostGuests(3, []);
    expect(result).toEqual({ possible: false, minRooms: 0 });
  });
});

// ---------------------------------------------------------------------------
// totalCapacityOfRooms
// ---------------------------------------------------------------------------

describe("totalCapacityOfRooms", () => {
  it("sums max capacities of all rooms", () => {
    const rooms = [room(2, 1), room(3, 2)];
    // (2+1) + (3+2) = 8
    expect(totalCapacityOfRooms(rooms)).toBe(8);
  });

  it("returns 0 for an empty array", () => {
    expect(totalCapacityOfRooms([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// canRoomsHostGuests
// ---------------------------------------------------------------------------

describe("canRoomsHostGuests", () => {
  it("returns true when guests fit", () => {
    expect(canRoomsHostGuests(4, [room(3, 2)])).toBe(true);
  });

  it("returns false when guests do not fit", () => {
    expect(canRoomsHostGuests(10, [room(2, 1)])).toBe(false);
  });
});
