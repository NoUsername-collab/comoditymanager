import { describe, expect, it } from "vitest";
import {
  isGanttBarCompact,
  isGanttStayMissingIdentity,
  isGanttStayMilestoneReached,
  isGanttStayUnpaid,
  resolveGanttStayTimeline,
} from "@/domain/gantt/stay-card-display";

describe("stay-card-display", () => {
  it("marks 1-2 day bars as compact", () => {
    expect(isGanttBarCompact(100 / 30, 30)).toBe(true);
    expect(isGanttBarCompact((100 / 30) * 2, 30)).toBe(true);
    expect(isGanttBarCompact((100 / 30) * 3, 30)).toBe(false);
  });

  it("builds hybrid timeline on check-in day", () => {
    const timeline = resolveGanttStayTimeline({
      segmentCheckIn: "2026-06-10",
      segmentCheckOut: "2026-06-13",
      bookingCheckIn: "2026-06-10",
      today: "2026-06-10",
      roomNames: ["7", "1"],
      checkedInRooms: ["7"],
      occupancyPhase: "active",
      isCerere: false,
      compact: false,
      paymentStatus: "unpaid",
      totalPrice: 500,
      guestId: "g1",
      identityStatus: "draft",
    });

    expect(timeline?.variant).toBe("hybrid");
    expect(timeline?.roomsChecked).toBe(1);
    expect(timeline?.roomsTotal).toBe(2);
    expect(timeline?.milestoneReached).toBe(false);
    expect(timeline?.checkinStarted).toBe(true);
    expect(timeline?.overallFillPct).toBeGreaterThan(0);
    expect(timeline?.overallFillPct).toBeLessThan(timeline!.checkinSegmentPct);
  });

  it("extends fill into stay segment after milestone", () => {
    const timeline = resolveGanttStayTimeline({
      segmentCheckIn: "2026-06-10",
      segmentCheckOut: "2026-06-13",
      bookingCheckIn: "2026-06-10",
      today: "2026-06-11",
      roomNames: ["7", "1"],
      checkedInRooms: ["7", "1"],
      occupancyPhase: "active",
      isCerere: false,
      compact: false,
      paymentStatus: "paid",
      totalPrice: 500,
      guestId: "g1",
      identityStatus: "complete",
    });

    expect(timeline?.variant).toBe("nights");
    expect(timeline?.milestoneReached).toBe(true);
    expect(timeline?.overallFillPct).toBeGreaterThan(30);
  });

  it("hides timeline on compact cards", () => {
    expect(
      resolveGanttStayTimeline({
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

  it("requires payment, identity and rooms for milestone", () => {
    expect(
      isGanttStayMilestoneReached({
        isCerere: false,
        roomNames: ["7"],
        checkedInRooms: ["7"],
        paymentStatus: "paid",
        totalPrice: 500,
        bookingCheckIn: "2026-06-10",
        today: "2026-06-10",
        occupancyPhase: "active",
        guestId: "g1",
        identityStatus: "complete",
      }),
    ).toBe(true);

    expect(
      isGanttStayMilestoneReached({
        isCerere: false,
        roomNames: ["7"],
        checkedInRooms: ["7"],
        paymentStatus: "unpaid",
        totalPrice: 500,
        bookingCheckIn: "2026-06-10",
        today: "2026-06-10",
        occupancyPhase: "active",
        guestId: "g1",
        identityStatus: "complete",
      }),
    ).toBe(false);
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
