import { describe, it, expect } from "vitest";
import {
  isAtLeastOneNight,
  rangesOverlap,
  toDateTime,
} from "@/domain/booking/conflict";

describe("isAtLeastOneNight", () => {
  it("returns true when checkOut is after checkIn", () => {
    expect(isAtLeastOneNight("2025-06-10", "2025-06-11")).toBe(true);
  });

  it("returns false when checkOut equals checkIn (zero nights)", () => {
    expect(isAtLeastOneNight("2025-06-10", "2025-06-10")).toBe(false);
  });

  it("returns false when checkOut is before checkIn", () => {
    expect(isAtLeastOneNight("2025-06-15", "2025-06-10")).toBe(false);
  });

  it("returns true for a multi-night stay", () => {
    expect(isAtLeastOneNight("2025-06-01", "2025-06-05")).toBe(true);
  });

  it("works across month boundaries", () => {
    expect(isAtLeastOneNight("2025-06-30", "2025-07-01")).toBe(true);
  });

  it("works across year boundaries", () => {
    expect(isAtLeastOneNight("2025-12-31", "2026-01-01")).toBe(true);
  });
});

describe("toDateTime", () => {
  it("creates a Date with correct date and time", () => {
    const dt = toDateTime("2025-06-15", "14:00");
    expect(dt.getFullYear()).toBe(2025);
    expect(dt.getMonth()).toBe(5); // 0-indexed
    expect(dt.getDate()).toBe(15);
    expect(dt.getHours()).toBe(14);
    expect(dt.getMinutes()).toBe(0);
  });
});

describe("rangesOverlap", () => {
  // Default times: check-in 14:00, check-out 11:00

  it("detects overlap for two bookings sharing the same period", () => {
    const a = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    const b = { checkIn: "2025-06-12", checkOut: "2025-06-18" };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it("detects overlap when one booking contains another", () => {
    const a = { checkIn: "2025-06-05", checkOut: "2025-06-20" };
    const b = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    expect(rangesOverlap(a, b)).toBe(true);
  });

  it("allows same-day turnover (checkout 11:00, next check-in 14:00)", () => {
    // A checks out on June 15 at 11:00, B checks in on June 15 at 14:00
    // aEnd = June 15 11:00, bStart = June 15 14:00
    // overlap: bStart < aEnd → false (14:00 < 11:00 is false) → no overlap
    const a = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    const b = { checkIn: "2025-06-15", checkOut: "2025-06-20" };
    expect(rangesOverlap(a, b)).toBe(false);
  });

  it("detects no overlap when bookings are completely separate", () => {
    const a = { checkIn: "2025-06-01", checkOut: "2025-06-05" };
    const b = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    expect(rangesOverlap(a, b)).toBe(false);
  });

  it("is symmetric (a overlaps b implies b overlaps a)", () => {
    const a = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    const b = { checkIn: "2025-06-12", checkOut: "2025-06-18" };
    expect(rangesOverlap(a, b)).toBe(rangesOverlap(b, a));
  });

  it("detects overlap with custom times", () => {
    // Using same check-in and check-out times (both 12:00) → no gap for turnover
    const a = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    const b = { checkIn: "2025-06-15", checkOut: "2025-06-20" };
    // With custom times where ciTime === coTime, they share the exact moment
    // bStart = June 15 12:00, aEnd = June 15 12:00, bStart < aEnd → false
    expect(rangesOverlap(a, b, "12:00", "12:00")).toBe(false);
  });

  it("detects overlap when checkout time is after next check-in time", () => {
    // If check-out is at 16:00 and check-in is at 14:00, same-day turnover overlaps
    const a = { checkIn: "2025-06-10", checkOut: "2025-06-15" };
    const b = { checkIn: "2025-06-15", checkOut: "2025-06-20" };
    // aEnd = June 15 16:00, bStart = June 15 14:00
    // bStart < aEnd → 14:00 < 16:00 → true → overlap!
    expect(rangesOverlap(a, b, "14:00", "16:00")).toBe(true);
  });
});
