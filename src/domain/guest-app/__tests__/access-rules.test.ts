import { describe, expect, test } from "vitest";
import {
  guestAccessClosesOn,
  guestAccessOpensOn,
  isGuestAccessDateValid,
  isGuestAccessBookingStatusValid,
} from "../access-rules";
import { buildGuestStayMilestones } from "../stay-milestone";

describe("guest access window", () => {
  test("earlyAccessDays 0 = no pre-check-in gate (from confirmation)", () => {
    expect(guestAccessOpensOn("2026-06-15", 0)).toBeNull();
    expect(
      isGuestAccessDateValid("2026-06-01", {
        checkIn: "2026-06-15",
        checkOut: "2026-06-18",
        earlyAccessDays: 0,
      }),
    ).toBeNull();
  });

  test("optional early window one day before check-in", () => {
    expect(guestAccessOpensOn("2026-06-15", 1)).toBe("2026-06-14");
  });

  test("closes on checkout day inclusive", () => {
    expect(guestAccessClosesOn("2026-06-18")).toBe("2026-06-18");
  });

  test("valid during stay", () => {
    expect(
      isGuestAccessDateValid("2026-06-16", {
        checkIn: "2026-06-15",
        checkOut: "2026-06-18",
        earlyAccessDays: 0,
      }),
    ).toBeNull();
  });

  test("denies after checkout", () => {
    expect(
      isGuestAccessDateValid("2026-06-19", {
        checkIn: "2026-06-15",
        checkOut: "2026-06-18",
        earlyAccessDays: 0,
      }),
    ).toBe("after_check_out");
  });

  test("only confirmed bookings", () => {
    expect(isGuestAccessBookingStatusValid("confirmata")).toBeNull();
    expect(isGuestAccessBookingStatusValid("cerere_noua")).toBe(
      "booking_not_confirmed",
    );
  });
});

describe("guest stay milestones", () => {
  test("confirmed until operational check-in", () => {
    const steps = buildGuestStayMilestones({
      today: "2026-06-14",
      checkIn: "2026-06-15",
      checkOut: "2026-06-18",
      checkedInAt: null,
    });
    expect(steps.find((s) => s.id === "confirmed")?.state).toBe("current");
    expect(steps.find((s) => s.id === "checked_in")?.state).toBe("upcoming");
  });

  test("checked_in after reception check-in", () => {
    const steps = buildGuestStayMilestones({
      today: "2026-06-16",
      checkIn: "2026-06-15",
      checkOut: "2026-06-18",
      checkedInAt: "2026-06-15T14:00:00Z",
    });
    expect(steps.find((s) => s.id === "confirmed")?.state).toBe("done");
    expect(steps.find((s) => s.id === "checked_in")?.state).toBe("current");
  });

  test("check-out milestone on departure day", () => {
    const steps = buildGuestStayMilestones({
      today: "2026-06-18",
      checkIn: "2026-06-15",
      checkOut: "2026-06-18",
      checkedInAt: "2026-06-15T14:00:00Z",
    });
    expect(steps.find((s) => s.id === "checked_in")?.state).toBe("done");
    expect(steps.find((s) => s.id === "checked_out")?.state).toBe("current");
  });
});
