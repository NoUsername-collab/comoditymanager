import { describe, it, expect } from "vitest";
import {
  dayIndexFromPointerX,
  intervalFromDayIndices,
  ghostBarFromDayIndices,
} from "@/domain/gantt/drag-create";

// ---------------------------------------------------------------------------
// dayIndexFromPointerX
// ---------------------------------------------------------------------------
describe("dayIndexFromPointerX", () => {
  it("returns the correct index for the middle of the row", () => {
    // Row starts at 100, width 700, 7 days.
    // clientX = 450 → relative 350/700 = 0.5 → floor(0.5*7) = 3
    expect(dayIndexFromPointerX(450, 100, 700, 7)).toBe(3);
  });

  it("returns 0 at the left edge", () => {
    expect(dayIndexFromPointerX(100, 100, 700, 7)).toBe(0);
  });

  it("returns dayCount-1 at the right edge", () => {
    // clientX = 800 → relative 700/700 = 1 → clamped to rowWidth → floor(1*7)=7 → clamped to 6
    expect(dayIndexFromPointerX(800, 100, 700, 7)).toBe(6);
  });

  it("returns 0 when dayCount is 0", () => {
    expect(dayIndexFromPointerX(450, 100, 700, 0)).toBe(0);
  });

  it("returns 0 when rowWidth is 0", () => {
    expect(dayIndexFromPointerX(450, 100, 0, 7)).toBe(0);
  });

  it("clamps negative pointer positions to 0", () => {
    expect(dayIndexFromPointerX(50, 100, 700, 7)).toBe(0);
  });

  it("clamps beyond-right pointer positions to dayCount-1", () => {
    expect(dayIndexFromPointerX(1000, 100, 700, 7)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// intervalFromDayIndices
// ---------------------------------------------------------------------------
describe("intervalFromDayIndices", () => {
  const days = [
    "2025-06-10",
    "2025-06-11",
    "2025-06-12",
    "2025-06-13",
    "2025-06-14",
  ];

  it("returns correct checkIn/checkOut for a normal range", () => {
    const result = intervalFromDayIndices(days, 1, 3);
    expect(result).toEqual({
      checkIn: "2025-06-11",
      checkOut: "2025-06-14", // addDays("2025-06-13", 1)
    });
  });

  it("returns null for an empty dayIsos array", () => {
    expect(intervalFromDayIndices([], 0, 2)).toBeNull();
  });

  it("returns a 1-night interval when startIdx equals endIdx", () => {
    const result = intervalFromDayIndices(days, 2, 2);
    expect(result).toEqual({
      checkIn: "2025-06-12",
      checkOut: "2025-06-13",
    });
  });

  it("clamps indices to the bounds of the array", () => {
    const result = intervalFromDayIndices(days, -5, 100);
    expect(result).toEqual({
      checkIn: "2025-06-10",
      checkOut: "2025-06-15",
    });
  });
});

// ---------------------------------------------------------------------------
// ghostBarPosition / ghostBarFromDayIndices — clock-aware, not full days
// ---------------------------------------------------------------------------
describe("ghostBarFromDayIndices", () => {
  const days = [
    "2025-06-01",
    "2025-06-02",
    "2025-06-03",
    "2025-06-04",
    "2025-06-05",
    "2025-06-06",
    "2025-06-07",
    "2025-06-08",
    "2025-06-09",
    "2025-06-10",
  ];
  const rangeStart = "2025-06-01";
  const rangeEnd = "2025-06-11";
  const checkInTime = "14:00";
  const checkOutTime = "11:00";

  it("starts at check-in time, not midnight of the first day", () => {
    const result = ghostBarFromDayIndices(
      days,
      0,
      0,
      rangeStart,
      rangeEnd,
      checkInTime,
      checkOutTime
    );
    expect(result).not.toBeNull();
    // 14:00 on day 0 of 10 days = 14h / 240h
    expect(result!.leftPct).toBeCloseTo((14 / 24 / 10) * 100, 5);
    // 14:00 day 0 → 11:00 day 1 = 21h / 240h
    expect(result!.widthPct).toBeCloseTo((21 / 24 / 10) * 100, 5);
  });

  it("ends at check-out time on the morning after the last night", () => {
    const result = ghostBarFromDayIndices(
      days,
      1,
      3,
      rangeStart,
      rangeEnd,
      checkInTime,
      checkOutTime
    );
    expect(result).not.toBeNull();
    // 14:00 on 2 Jun → 11:00 on 5 Jun (checkout morning of the day after last night)
    expect(result!.leftPct).toBeCloseTo(((1 + 14 / 24) / 10) * 100, 5);
    expect(result!.widthPct).toBeCloseTo((69 / 24 / 10) * 100, 5);
    const startOfFirstDay = (1 / 10) * 100;
    const midnightCheckoutDay = (4 / 10) * 100;
    expect(result!.leftPct).toBeGreaterThan(startOfFirstDay);
    expect(result!.leftPct + result!.widthPct).toBeGreaterThan(midnightCheckoutDay);
  });

  it("returns null for an empty day list", () => {
    expect(
      ghostBarFromDayIndices([], 0, 0, rangeStart, rangeEnd, checkInTime, checkOutTime)
    ).toBeNull();
  });
});
