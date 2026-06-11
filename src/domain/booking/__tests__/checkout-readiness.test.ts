import { describe, expect, it } from "vitest";
import {
  isLateCheckout,
  isUnpaidForCheckout,
  shouldBlockCheckoutForUnpaid,
} from "@/domain/booking/checkout-readiness";

describe("isUnpaidForCheckout", () => {
  it("treats null, unpaid and partial as unpaid", () => {
    expect(isUnpaidForCheckout(null)).toBe(true);
    expect(isUnpaidForCheckout("unpaid")).toBe(true);
    expect(isUnpaidForCheckout("partial")).toBe(true);
  });

  it("treats paid as settled", () => {
    expect(isUnpaidForCheckout("paid")).toBe(false);
  });
});

describe("shouldBlockCheckoutForUnpaid", () => {
  it("blocks when setting on and unpaid", () => {
    expect(
      shouldBlockCheckoutForUnpaid(
        { checkout_block_unpaid: true },
        "unpaid"
      )
    ).toBe(true);
  });

  it("allows when setting off", () => {
    expect(
      shouldBlockCheckoutForUnpaid(
        { checkout_block_unpaid: false },
        "unpaid"
      )
    ).toBe(false);
  });
});

describe("isLateCheckout", () => {
  it("detects checkout after configured until time", () => {
    expect(
      isLateCheckout("2026-06-11T14:00", { checkout_time_until: "12:00" })
    ).toBe(true);
    expect(
      isLateCheckout("2026-06-11T11:30", { checkout_time_until: "12:00" })
    ).toBe(false);
  });
});
