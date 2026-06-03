import { describe, it, expect } from "vitest";
import {
  computeSegmentTotal,
  computeBookingTotalFromSegments,
} from "@/domain/pricing/segment-total";

describe("computeSegmentTotal", () => {
  it("calculates total for a single segment with known rate and nights", () => {
    const seg = { segment_start: "2025-06-10", segment_end: "2025-06-13", nightly_rate: 100 };
    // 3 nights * 100 = 300
    expect(computeSegmentTotal(seg)).toBe(300);
  });

  it("treats null nightly_rate as 0", () => {
    const seg = { segment_start: "2025-06-10", segment_end: "2025-06-13", nightly_rate: null };
    expect(computeSegmentTotal(seg)).toBe(0);
  });

  it("rounds decimal rate correctly", () => {
    const seg = { segment_start: "2025-06-10", segment_end: "2025-06-13", nightly_rate: 33.33 };
    // 33.33 * 3 = 99.99
    expect(computeSegmentTotal(seg)).toBe(99.99);
  });

  it("returns 0 when segment_start equals segment_end (zero nights)", () => {
    const seg = { segment_start: "2025-06-10", segment_end: "2025-06-10", nightly_rate: 100 };
    expect(computeSegmentTotal(seg)).toBe(0);
  });

  it("handles cross-month segment", () => {
    // June 28 to July 2 = 4 nights
    const seg = { segment_start: "2025-06-28", segment_end: "2025-07-02", nightly_rate: 150 };
    expect(computeSegmentTotal(seg)).toBe(600);
  });
});

describe("computeBookingTotalFromSegments", () => {
  it("sums multiple segments correctly", () => {
    const segments = [
      { segment_start: "2025-06-10", segment_end: "2025-06-12", nightly_rate: 100 }, // 200
      { segment_start: "2025-06-12", segment_end: "2025-06-15", nightly_rate: 120 }, // 360
    ];
    expect(computeBookingTotalFromSegments(segments)).toBe(560);
  });

  it("returns 0 for an empty segments array", () => {
    expect(computeBookingTotalFromSegments([])).toBe(0);
  });

  it("handles segments with null rates among valid ones", () => {
    const segments = [
      { segment_start: "2025-06-10", segment_end: "2025-06-12", nightly_rate: 200 }, // 400
      { segment_start: "2025-06-12", segment_end: "2025-06-14", nightly_rate: null }, // 0
    ];
    expect(computeBookingTotalFromSegments(segments)).toBe(400);
  });

  it("rounds the final total to 2 decimal places", () => {
    const segments = [
      { segment_start: "2025-06-10", segment_end: "2025-06-13", nightly_rate: 33.33 }, // 99.99
      { segment_start: "2025-06-13", segment_end: "2025-06-16", nightly_rate: 33.33 }, // 99.99
    ];
    expect(computeBookingTotalFromSegments(segments)).toBe(199.98);
  });
});
