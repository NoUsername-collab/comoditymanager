import { describe, expect, test } from "vitest";
import {
  guestAccessClosesOn,
  guestAccessOpensOn,
  isGuestAccessDateValid,
  isGuestAccessBookingStatusValid,
} from "../access-rules";

describe("guest access window", () => {
  test("opens one day before check-in by default", () => {
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
        earlyAccessDays: 1,
      }),
    ).toBeNull();
  });

  test("denies after checkout", () => {
    expect(
      isGuestAccessDateValid("2026-06-19", {
        checkIn: "2026-06-15",
        checkOut: "2026-06-18",
        earlyAccessDays: 1,
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
