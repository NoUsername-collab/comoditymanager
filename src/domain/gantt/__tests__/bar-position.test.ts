import { describe, it, expect } from "vitest";
import { bookingBarInRange } from "@/domain/gantt/bar-position";

describe("bookingBarInRange", () => {
  // Standard check-in/check-out times
  const ciTime = "14:00";
  const coTime = "11:00";

  it("returns correct position for a booking fully within range", () => {
    // Range: Jan 1 – Jan 10 (10 days)
    // Booking: Jan 3 14:00 – Jan 7 11:00
    const result = bookingBarInRange(
      "2025-01-03",
      "2025-01-07",
      "2025-01-01",
      "2025-01-11",
      10,
      ciTime,
      coTime
    );
    expect(result).not.toBeNull();
    expect(result!.continuesBefore).toBe(false);
    expect(result!.continuesAfter).toBe(false);
    expect(result!.leftPct).toBeGreaterThan(0);
    expect(result!.widthPct).toBeGreaterThan(0);
    expect(result!.leftPct + result!.widthPct).toBeLessThanOrEqual(100);
  });

  it("marks continuesBefore when booking starts before range", () => {
    // Range: Jan 5 – Jan 15
    // Booking: Jan 1 – Jan 10
    const result = bookingBarInRange(
      "2025-01-01",
      "2025-01-10",
      "2025-01-05",
      "2025-01-15",
      10,
      ciTime,
      coTime
    );
    expect(result).not.toBeNull();
    expect(result!.continuesBefore).toBe(true);
    expect(result!.continuesAfter).toBe(false);
    expect(result!.leftPct).toBe(0); // starts at the beginning of the visible range
  });

  it("marks continuesAfter when booking ends after range", () => {
    // Range: Jan 1 – Jan 10
    // Booking: Jan 5 – Jan 15
    const result = bookingBarInRange(
      "2025-01-05",
      "2025-01-15",
      "2025-01-01",
      "2025-01-10",
      9,
      ciTime,
      coTime
    );
    expect(result).not.toBeNull();
    expect(result!.continuesBefore).toBe(false);
    expect(result!.continuesAfter).toBe(true);
  });

  it("returns null when booking is entirely outside range (before)", () => {
    const result = bookingBarInRange(
      "2025-01-01",
      "2025-01-03",
      "2025-01-10",
      "2025-01-20",
      10,
      ciTime,
      coTime
    );
    expect(result).toBeNull();
  });

  it("returns null when booking is entirely outside range (after)", () => {
    const result = bookingBarInRange(
      "2025-01-25",
      "2025-01-30",
      "2025-01-01",
      "2025-01-10",
      9,
      ciTime,
      coTime
    );
    expect(result).toBeNull();
  });

  it("returns non-zero width for a single-night booking", () => {
    // Booking: Jan 5 14:00 – Jan 6 11:00 (1 night)
    const result = bookingBarInRange(
      "2025-01-05",
      "2025-01-06",
      "2025-01-01",
      "2025-01-11",
      10,
      ciTime,
      coTime
    );
    expect(result).not.toBeNull();
    expect(result!.widthPct).toBeGreaterThan(0);
  });

  it("returns null when dayCount is 0", () => {
    const result = bookingBarInRange(
      "2025-01-05",
      "2025-01-10",
      "2025-01-01",
      "2025-01-10",
      0,
      ciTime,
      coTime
    );
    expect(result).toBeNull();
  });

  it("handles booking that spans the entire range", () => {
    const result = bookingBarInRange(
      "2025-01-01",
      "2025-01-31",
      "2025-01-01",
      "2025-02-01",
      31,
      ciTime,
      coTime
    );
    expect(result).not.toBeNull();
    expect(result!.continuesBefore).toBe(false);
    // Check-in at 14:00 means the bar doesn't start at 0%
    expect(result!.leftPct).toBeGreaterThan(0);
  });
});
