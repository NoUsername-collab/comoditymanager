import { describe, it, expect } from "vitest";
import {
  findOccupancyConflicts,
  hasOccupancyConflict,
} from "@/domain/occupancy/conflict";
import type { OccupancySegment } from "@/domain/occupancy/types";

function makeSeg(overrides: Partial<OccupancySegment> = {}): OccupancySegment {
  return {
    id: "seg1",
    kind: "stay",
    roomId: "r1",
    checkIn: "2025-06-10",
    checkOut: "2025-06-14",
    phase: "future",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findOccupancyConflicts
// ---------------------------------------------------------------------------
describe("findOccupancyConflicts", () => {
  it("returns empty array when there are no segments", () => {
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-12",
      [],
    );
    expect(result).toEqual([]);
  });

  it("returns a conflict for an overlapping segment", () => {
    const segments = [makeSeg({ checkIn: "2025-06-11", checkOut: "2025-06-15" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-13",
      segments,
    );
    expect(result).toHaveLength(1);
    expect(result[0].roomId).toBe("r1");
    expect(result[0].segment.id).toBe("seg1");
  });

  it("returns empty for non-overlapping segments", () => {
    // Segment ends before our range starts (same-day turnover allowed via time-based check)
    const segments = [makeSeg({ checkIn: "2025-06-05", checkOut: "2025-06-08" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-12",
      segments,
    );
    expect(result).toEqual([]);
  });

  it("excludes segments by bookingId", () => {
    const segments = [makeSeg({ bookingId: "booking-99" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-14",
      segments,
      { bookingId: "booking-99" },
    );
    expect(result).toEqual([]);
  });

  it("excludes segments by segmentId", () => {
    const segments = [makeSeg({ id: "seg-abc" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-14",
      segments,
      { segmentId: "seg-abc" },
    );
    expect(result).toEqual([]);
  });

  it("does not return conflicts for different roomIds", () => {
    const segments = [makeSeg({ roomId: "r2" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-14",
      segments,
    );
    expect(result).toEqual([]);
  });

  it("excludes hold segments by holdId", () => {
    const segments = [makeSeg({ id: "hold-1", kind: "hold" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-14",
      segments,
      { holdId: "hold-1" },
    );
    expect(result).toEqual([]);
  });

  it("excludes block segments by blockId", () => {
    const segments = [makeSeg({ id: "block-1", kind: "block" })];
    const result = findOccupancyConflicts(
      ["r1"],
      "2025-06-10",
      "2025-06-14",
      segments,
      { blockId: "block-1" },
    );
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// hasOccupancyConflict
// ---------------------------------------------------------------------------
describe("hasOccupancyConflict", () => {
  it("returns true when there is a conflict", () => {
    const segments = [makeSeg({ checkIn: "2025-06-11", checkOut: "2025-06-15" })];
    expect(
      hasOccupancyConflict(["r1"], "2025-06-10", "2025-06-13", segments),
    ).toBe(true);
  });

  it("returns false when there is no conflict", () => {
    const segments = [makeSeg({ checkIn: "2025-06-20", checkOut: "2025-06-22" })];
    expect(
      hasOccupancyConflict(["r1"], "2025-06-10", "2025-06-13", segments),
    ).toBe(false);
  });

  it("returns false with no segments", () => {
    expect(
      hasOccupancyConflict(["r1"], "2025-06-10", "2025-06-13", []),
    ).toBe(false);
  });
});
