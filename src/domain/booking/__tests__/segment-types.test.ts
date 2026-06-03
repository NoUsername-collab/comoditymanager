import { describe, it, expect } from "vitest";
import {
  resolveMovePivot,
  segmentNightCount,
} from "@/domain/booking/segment-types";

// ---------------------------------------------------------------------------
// resolveMovePivot
// ---------------------------------------------------------------------------

describe("resolveMovePivot", () => {
  const segStart = "2026-07-10";
  const segEnd = "2026-07-15";
  // Use a fixed "today" well before the segment so it does not interfere
  const today = "2026-07-01";

  it("returns the requested pivot when it is valid and in the middle", () => {
    const pivot = resolveMovePivot(segStart, segEnd, "2026-07-12", today);
    expect(pivot).toBe("2026-07-12");
  });

  it("adjusts pivot to segmentStart+1 when pivot <= segmentStart", () => {
    const pivot = resolveMovePivot(segStart, segEnd, "2026-07-09", today);
    expect(pivot).toBe("2026-07-11");
  });

  it("uses today when requested pivot is in the past", () => {
    // pivot "2026-06-20" < today "2026-07-01", so pivot becomes today
    // today "2026-07-01" <= segStart "2026-07-10", so pivot becomes segStart+1
    const pivot = resolveMovePivot(segStart, segEnd, "2026-06-20", today);
    expect(pivot).toBe("2026-07-11");
  });

  it("uses today when no pivot is requested", () => {
    // No requested pivot => uses today "2026-07-01"
    // today <= segStart => becomes segStart+1 = "2026-07-11"
    const pivot = resolveMovePivot(segStart, segEnd, undefined, today);
    expect(pivot).toBe("2026-07-11");
  });

  it('throws "segments.no_future_nights_to_move" when pivot >= segmentEnd', () => {
    expect(() =>
      resolveMovePivot(segStart, segEnd, "2026-07-15", today)
    ).toThrow("segments.no_future_nights_to_move");
  });

  it('throws "segments.no_future_nights_to_move" when pivot is after segmentEnd', () => {
    expect(() =>
      resolveMovePivot(segStart, segEnd, "2026-07-20", today)
    ).toThrow("segments.no_future_nights_to_move");
  });

  it("works with a segment of exactly 2 nights", () => {
    // segStart "2026-07-10", segEnd "2026-07-12" => 2 nights
    // pivot "2026-07-11" splits into [10-11] and [11-12] => 1 night each
    const pivot = resolveMovePivot("2026-07-10", "2026-07-12", "2026-07-11", today);
    expect(pivot).toBe("2026-07-11");
  });

  it("handles a segment where today is mid-segment and no pivot given", () => {
    const midToday = "2026-07-12";
    const pivot = resolveMovePivot(segStart, segEnd, undefined, midToday);
    expect(pivot).toBe("2026-07-12");
  });
});

// ---------------------------------------------------------------------------
// segmentNightCount
// ---------------------------------------------------------------------------

describe("segmentNightCount", () => {
  it("returns 1 for a 1-night segment", () => {
    expect(
      segmentNightCount({ segment_start: "2026-07-10", segment_end: "2026-07-11" })
    ).toBe(1);
  });

  it("returns 3 for a 3-night segment", () => {
    expect(
      segmentNightCount({ segment_start: "2026-07-10", segment_end: "2026-07-13" })
    ).toBe(3);
  });

  it("returns 0 when start equals end", () => {
    expect(
      segmentNightCount({ segment_start: "2026-07-10", segment_end: "2026-07-10" })
    ).toBe(0);
  });
});
