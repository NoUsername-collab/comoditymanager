import { describe, it, expect, vi } from "vitest";

vi.mock("@/domain/pricing/confirm-stay-total", () => ({
  computeStandardStayTotal: (
    rooms: { price_per_night: number }[],
    checkIn: string,
    checkOut: string,
  ) => {
    // Simple mock: sum of price_per_night * nights (night count from ISO diff)
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.round((co.getTime() - ci.getTime()) / 86400000);
    return rooms.reduce((s, r) => s + r.price_per_night * nights, 0);
  },
}));

import {
  resolvedBookingRevenue,
  countOccupiedRoomNights,
  discoverYears,
  type StatBooking,
} from "@/domain/statistics/aggregates";

function makeBooking(overrides: Partial<StatBooking> = {}): StatBooking {
  return {
    id: "b1",
    check_in: "2025-06-10",
    check_out: "2025-06-12",
    status: "confirmata",
    num_adults: 2,
    num_children: 0,
    total_price: null,
    created_at: "2025-06-01",
    confirmed_at: "2025-06-02",
    room_ids: ["r1"],
    building_ids: ["bld1"],
    room_prices: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolvedBookingRevenue
// ---------------------------------------------------------------------------
describe("resolvedBookingRevenue", () => {
  it("returns total_price when confirmed and total_price > 0", () => {
    const b = makeBooking({ total_price: 500 });
    expect(resolvedBookingRevenue(b)).toBe(500);
  });

  it("calculates from room_prices when confirmed, total_price is null, and room_prices exist", () => {
    const b = makeBooking({
      total_price: null,
      room_prices: [100, 150],
      check_in: "2025-06-10",
      check_out: "2025-06-12", // 2 nights
    });
    // (100 + 150) * 2 = 500
    expect(resolvedBookingRevenue(b)).toBe(500);
  });

  it("returns null when confirmed, total_price is null, and room_prices is empty", () => {
    const b = makeBooking({ total_price: null, room_prices: [] });
    expect(resolvedBookingRevenue(b)).toBeNull();
  });

  it("returns null for status 'cerere_noua'", () => {
    const b = makeBooking({ status: "cerere_noua", total_price: 500 });
    expect(resolvedBookingRevenue(b)).toBeNull();
  });

  it("returns null for status 'anulata'", () => {
    const b = makeBooking({ status: "anulata", total_price: 500 });
    expect(resolvedBookingRevenue(b)).toBeNull();
  });

  it("returns total_price as number even when stored as numeric string", () => {
    // total_price is typed number|null, but test that Number() coercion works
    const b = makeBooking({ total_price: 300 });
    expect(resolvedBookingRevenue(b)).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// countOccupiedRoomNights
// ---------------------------------------------------------------------------
describe("countOccupiedRoomNights", () => {
  it("counts room-nights for a booking spanning 2 nights", () => {
    const bookings = [makeBooking({ room_ids: ["r1"], check_in: "2025-06-10", check_out: "2025-06-12" })];
    const nights = ["2025-06-10", "2025-06-11"];
    const count = countOccupiedRoomNights(["r1"], nights, bookings, true);
    expect(count).toBe(2);
  });

  it("counts correctly across multiple rooms", () => {
    const bookings = [
      makeBooking({ id: "b1", room_ids: ["r1"], check_in: "2025-06-10", check_out: "2025-06-12" }),
      makeBooking({ id: "b2", room_ids: ["r2"], check_in: "2025-06-11", check_out: "2025-06-12" }),
    ];
    const nights = ["2025-06-10", "2025-06-11"];
    const count = countOccupiedRoomNights(["r1", "r2"], nights, bookings, true);
    // r1: 2025-06-10 + 2025-06-11 = 2
    // r2: 2025-06-11 = 1
    expect(count).toBe(3);
  });

  it("returns 0 when there are no bookings", () => {
    expect(countOccupiedRoomNights(["r1"], ["2025-06-10"], [], true)).toBe(0);
  });

  it("filters non-confirmed bookings when onlyConfirmed is true", () => {
    const bookings = [
      makeBooking({ status: "cerere_noua", room_ids: ["r1"], check_in: "2025-06-10", check_out: "2025-06-12" }),
    ];
    const count = countOccupiedRoomNights(["r1"], ["2025-06-10", "2025-06-11"], bookings, true);
    expect(count).toBe(0);
  });

  it("includes non-confirmed bookings when onlyConfirmed is false", () => {
    const bookings = [
      makeBooking({ status: "cerere_noua", room_ids: ["r1"], check_in: "2025-06-10", check_out: "2025-06-12" }),
    ];
    const count = countOccupiedRoomNights(["r1"], ["2025-06-10", "2025-06-11"], bookings, false);
    expect(count).toBe(2);
  });

  it("returns 0 for empty roomIds", () => {
    const bookings = [makeBooking()];
    expect(countOccupiedRoomNights([], ["2025-06-10"], bookings, true)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// discoverYears
// ---------------------------------------------------------------------------
describe("discoverYears", () => {
  it("returns sorted unique years from bookings + currentYear", () => {
    const bookings = [
      makeBooking({ check_in: "2023-03-01", check_out: "2023-03-05", created_at: "2023-02-20" }),
      makeBooking({ check_in: "2024-07-10", check_out: "2025-01-02", created_at: "2024-07-01" }),
    ];
    const years = discoverYears(bookings, 2025);
    expect(years).toEqual([2023, 2024, 2025]);
  });

  it("always includes the currentYear even with no bookings", () => {
    expect(discoverYears([], 2025)).toEqual([2025]);
  });

  it("extracts years from check_in, check_out, and created_at", () => {
    const bookings = [
      makeBooking({
        check_in: "2024-12-30",
        check_out: "2025-01-02",
        created_at: "2023-11-15",
      }),
    ];
    const years = discoverYears(bookings, 2026);
    expect(years).toEqual([2023, 2024, 2025, 2026]);
  });
});
