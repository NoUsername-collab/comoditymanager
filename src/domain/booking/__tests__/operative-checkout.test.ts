import { describe, expect, it } from "vitest";
import {
  daysSincePlannedCheckout,
  defaultOperativeCheckoutDatetime,
  isOverdueUnclosedStay,
  shouldApplyEarlyDeparturePolicy,
} from "@/domain/booking/operative-checkout";

describe("isOverdueUnclosedStay", () => {
  it("detects stays past planned checkout without actual checkout", () => {
    expect(
      isOverdueUnclosedStay({
        plannedCheckOut: "2026-06-12",
        today: "2026-06-24",
        actualCheckOutAt: null,
      })
    ).toBe(true);
  });

  it("returns false when checkout already recorded", () => {
    expect(
      isOverdueUnclosedStay({
        plannedCheckOut: "2026-06-12",
        today: "2026-06-24",
        actualCheckOutAt: "2026-06-12T12:00:00.000Z",
      })
    ).toBe(false);
  });

  it("returns false on or before planned checkout day", () => {
    expect(
      isOverdueUnclosedStay({
        plannedCheckOut: "2026-06-12",
        today: "2026-06-12",
        actualCheckOutAt: null,
      })
    ).toBe(false);
  });
});

describe("daysSincePlannedCheckout", () => {
  it("counts calendar days after planned checkout", () => {
    expect(daysSincePlannedCheckout("2026-06-12", "2026-06-24")).toBe(12);
  });

  it("returns zero when not overdue", () => {
    expect(daysSincePlannedCheckout("2026-06-12", "2026-06-12")).toBe(0);
  });
});

describe("defaultOperativeCheckoutDatetime", () => {
  it("uses planned checkout date and configured hour", () => {
    expect(
      defaultOperativeCheckoutDatetime("2026-06-12", "12:00:00")
    ).toBe("2026-06-12T12:00");
  });

  it("falls back to noon when hour missing", () => {
    expect(defaultOperativeCheckoutDatetime("2026-06-12", null)).toBe(
      "2026-06-12T12:00"
    );
  });
});

describe("shouldApplyEarlyDeparturePolicy", () => {
  it("skips policy for overdue unclosed stays", () => {
    expect(
      shouldApplyEarlyDeparturePolicy("2026-06-12", "2026-06-24", null)
    ).toBe(false);
  });

  it("applies policy on departure day", () => {
    expect(
      shouldApplyEarlyDeparturePolicy("2026-06-12", "2026-06-12", null)
    ).toBe(true);
  });
});
