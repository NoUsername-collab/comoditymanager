import { describe, it, expect } from "vitest";
import {
  dayIndexFromPointerX,
  intervalFromDayIndices,
  ghostBarPosition,
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
// ghostBarPosition
// ---------------------------------------------------------------------------
describe("ghostBarPosition", () => {
  it("returns correct percentage for a normal range", () => {
    // startIdx=1, endIdx=3, dayCount=10
    // span = 3-1+1 = 3
    const result = ghostBarPosition(1, 3, 10);
    expect(result.leftPct).toBe(10); // 1/10*100
    expect(result.widthPct).toBe(30); // 3/10*100
  });

  it("handles reversed indices (startIdx > endIdx)", () => {
    const normal = ghostBarPosition(1, 3, 10);
    const reversed = ghostBarPosition(3, 1, 10);
    expect(reversed).toEqual(normal);
  });

  it("returns correct result for a single day", () => {
    const result = ghostBarPosition(4, 4, 10);
    expect(result.leftPct).toBe(40);
    expect(result.widthPct).toBe(10);
  });
});
