import { describe, it, expect, vi } from "vitest";

vi.mock("@/domain/pricing/confirm-stay-total", () => ({
  computeStandardStayTotal: (
    rooms: { price_per_night: number }[],
    checkIn: string,
    checkOut: string,
  ) => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.round((co.getTime() - ci.getTime()) / 86400000);
    return rooms.reduce((s, r) => s + r.price_per_night * nights, 0);
  },
}));

import { buildMonthComparison } from "@/domain/statistics/month-compare";
import type { StatBooking, ActiveRoomSnapshot } from "@/domain/statistics/aggregates";

function makeBooking(overrides: Partial<StatBooking> = {}): StatBooking {
  return {
    id: "b1",
    check_in: "2025-06-10",
    check_out: "2025-06-12",
    status: "confirmata",
    num_adults: 2,
    num_children: 0,
    total_price: 500,
    created_at: "2025-06-01",
    confirmed_at: "2025-06-02",
    room_ids: ["r1"],
    building_ids: ["bld1"],
    room_prices: [],
    ...overrides,
  };
}

const rooms: ActiveRoomSnapshot[] = [
  { id: "r1", building_id: "bld1", building_name: "Main" },
  { id: "r2", building_id: "bld1", building_name: "Main" },
];

// ---------------------------------------------------------------------------
// buildMonthComparison
// ---------------------------------------------------------------------------
describe("buildMonthComparison", () => {
  it("returns a current month snapshot with bookings", () => {
    const bookings = [
      makeBooking({
        id: "b1",
        check_in: "2025-06-10",
        check_out: "2025-06-12",
        total_price: 500,
      }),
    ];
    const result = buildMonthComparison(bookings, rooms, "2025-06-15");

    expect(result.current.year).toBe(2025);
    expect(result.current.month).toBe(5); // June = index 5
    expect(result.current.monthLabel).toBe("Iunie");
    expect(result.current.confirmedStays).toBe(1);
    expect(result.current.revenueRon).toBe(500);
    expect(result.current.activeRooms).toBe(2);
  });

  it("returns previousYear as null when no previous year data exists", () => {
    const bookings = [
      makeBooking({ check_in: "2025-06-10", check_out: "2025-06-12" }),
    ];
    const result = buildMonthComparison(bookings, rooms, "2025-06-15");

    expect(result.previousYear).toBeNull();
    expect(result.occupancyDeltaPct).toBeNull();
    expect(result.revenueDeltaPct).toBeNull();
  });

  it("calculates deltas when previous year data exists", () => {
    const bookings = [
      makeBooking({
        id: "b-curr",
        check_in: "2025-06-10",
        check_out: "2025-06-12",
        total_price: 600,
        confirmed_at: "2025-06-01",
      }),
      makeBooking({
        id: "b-prev",
        check_in: "2024-06-10",
        check_out: "2024-06-12",
        total_price: 400,
        confirmed_at: "2024-06-01",
        created_at: "2024-06-01",
      }),
    ];
    const result = buildMonthComparison(bookings, rooms, "2025-06-15");

    expect(result.previousYear).not.toBeNull();
    expect(result.previousYear!.year).toBe(2024);
    expect(result.previousYear!.revenueRon).toBe(400);
    expect(result.occupancyDeltaPct).toBeTypeOf("number");
    // Revenue delta: (600-400)/400 * 100 = 50
    expect(result.revenueDeltaPct).toBe(50);
  });

  it("handles empty bookings", () => {
    const result = buildMonthComparison([], rooms, "2025-06-15");
    expect(result.current.confirmedStays).toBe(0);
    expect(result.current.occupiedRoomNights).toBe(0);
    expect(result.current.revenueRon).toBe(0);
    expect(result.previousYear).toBeNull();
  });
});
