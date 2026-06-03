import { describe, it, expect } from "vitest";
import {
  computeDailyFreeCounts,
  dailyFreeHeatLevel,
} from "@/domain/gantt/daily-free-counts";

// ---------------------------------------------------------------------------
// dailyFreeHeatLevel
// ---------------------------------------------------------------------------
describe("dailyFreeHeatLevel", () => {
  it("returns 'mid' when total is 0", () => {
    expect(dailyFreeHeatLevel(0, 0)).toBe("mid");
  });

  it("returns 'full' when free is 0", () => {
    expect(dailyFreeHeatLevel(0, 10)).toBe("full");
  });

  it("returns 'high' when free >= 3 and ratio >= 0.35", () => {
    // 4 free out of 10 → ratio 0.4, free >= 3
    expect(dailyFreeHeatLevel(4, 10)).toBe("high");
  });

  it("returns 'mid' when ratio >= 0.15 but conditions for high not met", () => {
    // 2 free out of 10 → ratio 0.2, free >= 2 → "mid"
    expect(dailyFreeHeatLevel(2, 10)).toBe("mid");
  });

  it("returns 'mid' when free >= 2 regardless of ratio", () => {
    // 2 free out of 100 → ratio 0.02 but free >= 2 → "mid"
    expect(dailyFreeHeatLevel(2, 100)).toBe("mid");
  });

  it("returns 'low' when 1 free out of 10", () => {
    // 1 free out of 10 → ratio 0.1, free < 2 → "low"
    expect(dailyFreeHeatLevel(1, 10)).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// computeDailyFreeCounts
// ---------------------------------------------------------------------------
describe("computeDailyFreeCounts", () => {
  const rooms = [
    { id: "r1" },
    { id: "r2" },
    { id: "r3" },
  ] as { id: string }[];

  const dayIsos = ["2025-06-10", "2025-06-11", "2025-06-12"];

  it("returns all rooms free when there are no bookings or occupancy", () => {
    const result = computeDailyFreeCounts(
      rooms as any,
      [],
      [],
      dayIsos,
    );
    expect(result).toHaveLength(3);
    for (const day of result) {
      expect(day.free).toBe(3);
      expect(day.total).toBe(3);
      expect(day.occupied).toBe(0);
    }
  });

  it("marks rooms as occupied for a booking covering one day", () => {
    const bookings = [
      {
        room_ids: ["r1"],
        check_in: "2025-06-11",
        check_out: "2025-06-12",
        status: "confirmata",
      },
    ] as any[];

    const result = computeDailyFreeCounts(rooms as any, bookings, [], dayIsos);
    // 2025-06-11 is occupied (nightOccupied: date >= checkIn && date < checkOut)
    const day10 = result.find((d) => d.iso === "2025-06-10")!;
    const day11 = result.find((d) => d.iso === "2025-06-11")!;
    const day12 = result.find((d) => d.iso === "2025-06-12")!;

    expect(day10.free).toBe(3);
    expect(day11.free).toBe(2);
    expect(day11.occupied).toBe(1);
    expect(day12.free).toBe(3);
  });

  it("ignores cancelled bookings (status 'anulata')", () => {
    const bookings = [
      {
        room_ids: ["r1"],
        check_in: "2025-06-10",
        check_out: "2025-06-13",
        status: "anulata",
      },
    ] as any[];

    const result = computeDailyFreeCounts(rooms as any, bookings, [], dayIsos);
    for (const day of result) {
      expect(day.free).toBe(3);
    }
  });

  it("returns free 0, total 0 when rooms array is empty", () => {
    const result = computeDailyFreeCounts([] as any, [], [], dayIsos);
    for (const day of result) {
      expect(day.free).toBe(0);
      expect(day.total).toBe(0);
    }
  });

  it("counts occupancy segments as well", () => {
    const segments = [
      {
        id: "seg1",
        kind: "block" as const,
        roomId: "r2",
        checkIn: "2025-06-10",
        checkOut: "2025-06-12",
        phase: "future" as const,
      },
    ];

    const result = computeDailyFreeCounts(rooms as any, [], segments, dayIsos);
    expect(result.find((d) => d.iso === "2025-06-10")!.occupied).toBe(1);
    expect(result.find((d) => d.iso === "2025-06-11")!.occupied).toBe(1);
    expect(result.find((d) => d.iso === "2025-06-12")!.occupied).toBe(0);
  });
});
