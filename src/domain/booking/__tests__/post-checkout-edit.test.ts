import { describe, expect, it } from "vitest";
import {
  assertBookingEditableAfterCheckout,
  canEditAfterCheckout,
} from "@/domain/booking/post-checkout-edit";

describe("canEditAfterCheckout", () => {
  it("allows owner always", () => {
    expect(
      canEditAfterCheckout({
        memberRole: "owner",
        allowPostCheckoutEdits: false,
      })
    ).toBe(true);
  });

  it("allows staff when setting enabled", () => {
    expect(
      canEditAfterCheckout({
        memberRole: "operator",
        allowPostCheckoutEdits: true,
      })
    ).toBe(true);
  });

  it("blocks staff when setting disabled", () => {
    expect(
      canEditAfterCheckout({
        memberRole: "admin",
        allowPostCheckoutEdits: false,
      })
    ).toBe(false);
  });
});

describe("assertBookingEditableAfterCheckout", () => {
  it("no-ops when checkout not recorded", () => {
    expect(() =>
      assertBookingEditableAfterCheckout(
        { actual_check_out_at: null },
        { memberRole: "operator", allowPostCheckoutEdits: false }
      )
    ).not.toThrow();
  });

  it("throws when checkout done and staff cannot edit", () => {
    expect(() =>
      assertBookingEditableAfterCheckout(
        { actual_check_out_at: "2026-06-14T10:00:00Z" },
        { memberRole: "operator", allowPostCheckoutEdits: false }
      )
    ).toThrow("booking.checkout_locked");
  });
});
