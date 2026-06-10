import { describe, expect, it } from "vitest";
import {
  isGanttBarCompact,
  isGanttStayMissingIdentity,
  isGanttStayUnpaid,
  resolveGanttStayBarProgress,
} from "@/domain/gantt/stay-card-display";

describe("stay-card-display", () => {
  it("marks 1-2 day bars as compact", () => {
    expect(isGanttBarCompact(100 / 30, 30)).toBe(true);
    expect(isGanttBarCompact((100 / 30) * 2, 30)).toBe(true);
    expect(isGanttBarCompact((100 / 30) * 3, 30)).toBe(false);
  });

  it("uses room progress on check-in day", () => {
    const progress = resolveGanttStayBarProgress({
      segmentCheckIn: "2026-06-10",
      segmentCheckOut: "2026-06-13",
      bookingCheckIn: "2026-06-10",
      today: "2026-06-10",
      roomNames: ["7", "1"],
      checkedInRooms: ["7"],
      occupancyPhase: "active",
      isCerere: false,
      compact: false,
    });

    expect(progress).toEqual({
      mode: "rooms",
      current: 1,
      total: 2,
      pct: 50,
    });
  });

  it("hides progress on compact cards", () => {
    expect(
      resolveGanttStayBarProgress({
        segmentCheckIn: "2026-06-10",
        segmentCheckOut: "2026-06-13",
        bookingCheckIn: "2026-06-10",
        today: "2026-06-10",
        roomNames: ["7", "1"],
        checkedInRooms: [],
        occupancyPhase: "active",
        isCerere: false,
        compact: true,
      }),
    ).toBeNull();
  });

  it("flags unpaid on arrival day without payment record", () => {
    expect(
      isGanttStayUnpaid({
        isCerere: false,
        paymentStatus: null,
        totalPrice: 500,
        bookingCheckIn: "2026-06-10",
        today: "2026-06-10",
        occupancyPhase: "future",
      }),
    ).toBe(true);
  });

  it("flags missing identity for draft guests", () => {
    expect(
      isGanttStayMissingIdentity({
        guestId: "g1",
        identityStatus: "draft",
      }),
    ).toBe(true);
    expect(
      isGanttStayMissingIdentity({
        guestId: "g1",
        identityStatus: "complete",
      }),
    ).toBe(false);
  });
});
