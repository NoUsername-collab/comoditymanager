import { describe, expect, it } from "vitest";
import {
  ganttQuickNightsBetween,
  hasGanttQuickIntervalConflict,
  isGanttQuickIntervalInvalid,
  resolveGanttQuickActiveRoomIds,
} from "@/domain/gantt/quick-interval";describe("gantt quick interval", () => {
  it("counts nights between dates", () => {
    expect(ganttQuickNightsBetween("2026-06-01", "2026-06-03")).toBe(2);
    expect(ganttQuickNightsBetween("2026-06-01", "2026-06-01")).toBe(0);
  });

  it("resolves active room ids from draft or selection", () => {
    expect(
      resolveGanttQuickActiveRoomIds({
        draftRoomIds: ["r1", "r2"],
        activeRoomId: "r9",
      }),
    ).toEqual(["r1", "r2"]);
    expect(
      resolveGanttQuickActiveRoomIds({
        activeRoomId: "r9",
      }),
    ).toEqual(["r9"]);
  });

  it("detects invalid intervals", () => {
    expect(isGanttQuickIntervalInvalid("2026-06-03", "2026-06-01")).toBe(true);
    expect(isGanttQuickIntervalInvalid("2026-06-01", "2026-06-03")).toBe(false);
  });

  it("flags booking conflicts on overlapping stays", () => {
    const bookings = [
      {
        id: "b1",
        room_ids: ["r1"],
        check_in: "2026-06-01",
        check_out: "2026-06-05",
        status: "confirmed",
      },
    ] as const;

    expect(
      hasGanttQuickIntervalConflict({
        roomIds: ["r1"],
        checkIn: "2026-06-02",
        checkOut: "2026-06-04",
        bookings: bookings as never,
      }),
    ).toBe(true);

    expect(
      hasGanttQuickIntervalConflict({
        roomIds: ["r2"],
        checkIn: "2026-06-02",
        checkOut: "2026-06-04",
        bookings: bookings as never,
      }),
    ).toBe(false);
  });
});

