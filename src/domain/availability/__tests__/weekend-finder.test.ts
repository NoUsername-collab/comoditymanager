import { describe, it, expect } from "vitest";
import {
  findNextWeekendWithRooms,
  scanWeekendsInDays,
  type WeekendPick,
} from "@/domain/availability/weekend-finder";
import type { ComputedDay } from "@/domain/availability/compute";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal DayAvailability (ComputedDay) for testing. */
function makeDay(iso: string, free_rooms: number, total_rooms = 10): ComputedDay {
  const d = new Date(iso + "T00:00:00");
  const weekdays = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "Sa"];
  return {
    iso,
    day: d.getDate(),
    weekday: weekdays[d.getDay()],
    free_rooms,
    total_rooms,
    occupied_rooms: total_rooms - free_rooms,
    occupancy_pct: total_rooms > 0 ? Math.round(((total_rooms - free_rooms) / total_rooms) * 100) : 0,
    pressure: free_rooms <= 0 ? "full" : free_rooms === 1 ? "tight" : free_rooms <= 2 ? "moderate" : "relaxed",
    status: free_rooms > 0 ? "available" : "full",
    checkins: 0,
    checkouts: 0,
    unassigned_cereri: 0,
    pending_cereri: 0,
  };
}

/**
 * Generate a range of days from startIso for `count` days.
 * freeRoomsFn maps day index to free_rooms count.
 */
function makeDays(
  startIso: string,
  count: number,
  freeRoomsFn: (i: number, iso: string) => number = () => 5
): ComputedDay[] {
  const days: ComputedDay[] = [];
  const start = new Date(startIso + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push(makeDay(iso, freeRoomsFn(i, iso)));
  }
  return days;
}

// ---------------------------------------------------------------------------
// findNextWeekendWithRooms
// ---------------------------------------------------------------------------

describe("findNextWeekendWithRooms", () => {
  it("returns a WeekendPick when a Saturday has enough free rooms", () => {
    // 2026-07-04 is a Saturday
    const days = makeDays("2026-07-04", 7, () => 5);
    const result = findNextWeekendWithRooms(days, "2026-07-01", 2);
    expect(result).not.toBeNull();
    expect(result!.saturday_iso).toBe("2026-07-04");
    expect(result!.sunday_iso).toBe("2026-07-05");
    expect(result!.min_free_rooms).toBe(5);
  });

  it("returns null when no Saturday has enough rooms", () => {
    // All days have 0 free rooms
    const days = makeDays("2026-07-04", 14, () => 0);
    const result = findNextWeekendWithRooms(days, "2026-07-01", 2);
    expect(result).toBeNull();
  });

  it("scans forward from fromIso, skipping weekends with insufficient rooms", () => {
    // 2026-07-04 (Sat) has 0 free, 2026-07-11 (Sat) has 5 free
    // Need the full range so the cursor can iterate day-by-day through the array
    const days = makeDays("2026-07-01", 14, (_i, iso) => {
      if (iso === "2026-07-04" || iso === "2026-07-05") return 0;
      return 5;
    });
    const result = findNextWeekendWithRooms(days, "2026-07-01", 2);
    expect(result).not.toBeNull();
    expect(result!.saturday_iso).toBe("2026-07-11");
  });

  it("respects maxScanDays limit", () => {
    // Weekend exists but is beyond maxScanDays
    const days = makeDays("2026-07-11", 2, () => 5); // Sat Jul 11
    const result = findNextWeekendWithRooms(days, "2026-07-01", 2, 5);
    // maxScanDays=5, from Jul 1 scans up to Jul 5, Jul 11 is beyond
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scanWeekendsInDays
// ---------------------------------------------------------------------------

describe("scanWeekendsInDays", () => {
  it("returns all qualifying weekends", () => {
    // Two Saturdays: 2026-07-04 and 2026-07-11
    const days = makeDays("2026-07-04", 14, () => 5);
    const result = scanWeekendsInDays(days, 2);
    expect(result.length).toBe(2);
    expect(result[0].saturday_iso).toBe("2026-07-04");
    expect(result[1].saturday_iso).toBe("2026-07-11");
  });

  it("skips weekends below minFree threshold", () => {
    // First Sat has 1 free, second has 5 free
    const days = [
      makeDay("2026-07-04", 1), // Saturday with 1 free
      makeDay("2026-07-05", 1), // Sunday with 1 free
      ...makeDays("2026-07-06", 5, () => 5),
      makeDay("2026-07-11", 5), // Saturday with 5 free
      makeDay("2026-07-12", 5), // Sunday with 5 free
    ];
    const result = scanWeekendsInDays(days, 2);
    expect(result.length).toBe(1);
    expect(result[0].saturday_iso).toBe("2026-07-11");
  });

  it("returns empty array for empty days input", () => {
    const result = scanWeekendsInDays([], 2);
    expect(result).toEqual([]);
  });
});
