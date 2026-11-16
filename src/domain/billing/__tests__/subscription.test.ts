import { describe, expect, it } from "vitest";
import {
  billingSituation,
  billingStateFromSubscription,
  hasLiveSubscription,
  planForPrice,
  type StripeSubscriptionSnapshot,
} from "@/domain/billing/subscription";
import { signStripePayload, verifyStripeSignature } from "@/lib/billing/stripe-signature";
import { encodeStripeForm } from "@/lib/billing/stripe";

const prices = { essential: "price_light", professional: "price_pro" };
const sub = (over: Partial<StripeSubscriptionSnapshot>): StripeSubscriptionSnapshot => ({
  id: "sub_1",
  status: "active",
  customer: "cus_1",
  priceId: "price_pro",
  currentPeriodEnd: 1_800_000_000,
  cancelAtPeriodEnd: false,
  tenantId: "t1",
  ...over,
});

describe("the plan a subscription gives", () => {
  it("knows only Zalmox's own prices", () => {
    expect(planForPrice("price_light", prices)).toBe("essential");
    expect(planForPrice("price_pro", prices)).toBe("professional");
    expect(planForPrice("price_other", prices)).toBeNull();
  });

  it("gives the plan while paid, and keeps it while Stripe retries a failed card", () => {
    for (const status of ["active", "trialing", "past_due"] as const) {
      expect(billingStateFromSubscription(sub({ status }), prices)).toMatchObject({
        planId: "professional",
        isPaying: true,
      });
    }
    expect(billingStateFromSubscription(sub({}), prices).currentPeriodEnd).toBe(
      "2027-01-15T08:00:00.000Z",
    );
  });

  it("goes back to Basic when cancelled, unpaid, never paid or paused, and for an unknown price", () => {
    for (const status of [
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ] as const) {
      expect(billingStateFromSubscription(sub({ status }), prices)).toMatchObject({
        planId: "free",
        isPaying: false,
        subscriptionStatus: status,
      });
    }
    expect(billingStateFromSubscription(sub({ priceId: "price_other" }), prices)).toMatchObject({
      planId: "free",
      isPaying: false,
    });
  });

  it("tells the owner how the plan is paid", () => {
    const base = {
      planId: "professional",
      isPaying: true,
      currentPeriodEnd: "2027-01-15T00:00:00Z",
      cancelAtPeriodEnd: false,
    };
    expect(billingSituation({ ...base, subscriptionStatus: "active" })).toEqual({
      kind: "card",
      renewsOn: base.currentPeriodEnd,
    });
    expect(
      billingSituation({ ...base, subscriptionStatus: "active", cancelAtPeriodEnd: true }),
    ).toEqual({ kind: "cancelling", endsOn: base.currentPeriodEnd });
    expect(billingSituation({ ...base, subscriptionStatus: "past_due" })).toEqual({
      kind: "payment_failed",
    });
    expect(billingSituation({ ...base, subscriptionStatus: null })).toEqual({ kind: "manual" });
    expect(
      billingSituation({
        ...base,
        planId: "free",
        isPaying: false,
        subscriptionStatus: "canceled",
      }),
    ).toEqual({ kind: "free" });
    expect(hasLiveSubscription("canceled")).toBe(false);
    expect(hasLiveSubscription("past_due")).toBe(true);
  });
});

describe("Stripe's webhook signature", () => {
  const secret = "whsec_test";
  const body = '{"id":"evt_1","type":"customer.subscription.updated"}';
  const now = 1_800_000_000;

  it("accepts the body Stripe signed, within five minutes", () => {
    const header = signStripePayload(body, secret, now - 60);
    expect(verifyStripeSignature(body, header, secret, now)).toBe(true);
    // While a secret is being rolled, any one of several signatures may match.
    expect(verifyStripeSignature(body, `${header},v1=${"0".repeat(64)}`, secret, now)).toBe(true);
  });

  it("refuses a changed body, another secret, an old signature or a missing header", () => {
    const header = signStripePayload(body, secret, now);
    expect(verifyStripeSignature(body.replace("evt_1", "evt_2"), header, secret, now)).toBe(false);
    expect(verifyStripeSignature(body, header, "whsec_other", now)).toBe(false);
    expect(
      verifyStripeSignature(body, signStripePayload(body, secret, now - 600), secret, now),
    ).toBe(false);
    expect(verifyStripeSignature(body, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(body, "t=abc,v1=zz", secret, now)).toBe(false);
  });
});

describe("Stripe's form encoding", () => {
  it("writes nested objects and lists with brackets and leaves empty values out", () => {
    expect(
      encodeStripeForm({
        mode: "subscription",
        line_items: [{ price: "price_pro", quantity: 1 }],
        automatic_tax: { enabled: true },
        customer: undefined,
        metadata: { tenant_id: "t 1" },
      }),
    ).toBe(
      "mode=subscription&line_items%5B0%5D%5Bprice%5D=price_pro&line_items%5B0%5D%5Bquantity%5D=1&automatic_tax%5Benabled%5D=true&metadata%5Btenant_id%5D=t%201",
    );
  });
});
