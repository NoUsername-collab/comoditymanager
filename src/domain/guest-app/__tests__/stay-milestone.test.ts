import { describe, expect, it } from "vitest";
import {
  buildGuestStayMilestones,
  countStayNights,
  resolveGuestPhaseHintKey,
  resolveGuestStayPhase,
} from "../stay-milestone";

describe("resolveGuestPhaseHintKey", () => {
  it("returns checkinToday on check-in date", () => {
    expect(
      resolveGuestPhaseHintKey({
        today: "2026-06-10",
        checkIn: "2026-06-10",
        checkOut: "2026-06-12",
        checkedInAt: null,
      }),
    ).toBe("phase.checkinToday");
  });

  it("returns checkedIn after reception check-in", () => {
    expect(
      resolveGuestPhaseHintKey({
        today: "2026-06-11",
        checkIn: "2026-06-10",
        checkOut: "2026-06-12",
        checkedInAt: "2026-06-10T14:00:00Z",
      }),
    ).toBe("phase.checkedIn");
  });
});

describe("countStayNights", () => {
  it("counts nights between dates", () => {
    expect(countStayNights("2026-06-10", "2026-06-12")).toBe(2);
  });
});

describe("resolveGuestStayPhase", () => {
  it("returns confirmed before check-in", () => {
    expect(
      resolveGuestStayPhase({
        today: "2026-06-09",
        checkIn: "2026-06-10",
        checkOut: "2026-06-12",
        checkedInAt: null,
      }),
    ).toBe("confirmed");
  });

  it("keeps the stay open on checkout morning", () => {
    const input = {
      today: "2026-06-12",
      checkIn: "2026-06-10",
      checkOut: "2026-06-12",
      checkedInAt: "2026-06-10T14:00:00Z",
    };
    expect(resolveGuestStayPhase(input)).toBe("checked_in");
    expect(resolveGuestPhaseHintKey(input)).toBe("phase.checkoutToday");
    expect(buildGuestStayMilestones(input).find((step) => step.state === "current")?.id).toBe(
      "checked_out",
    );
  });

  it("closes the stay the day after checkout", () => {
    expect(
      resolveGuestStayPhase({
        today: "2026-06-13",
        checkIn: "2026-06-10",
        checkOut: "2026-06-12",
        checkedInAt: "2026-06-10T14:00:00Z",
      }),
    ).toBe("checked_out");
  });
});
