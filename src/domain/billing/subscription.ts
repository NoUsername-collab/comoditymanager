import type { PlanId } from "@/core/config/plans";

/** The plans an owner can pay for by card; Business stays with the Zalmox team. */
export const CARD_PLANS = ["essential", "professional"] as const;
export type CardPlanId = (typeof CARD_PLANS)[number];

export function isCardPlan(value: string): value is CardPlanId {
  return (CARD_PLANS as readonly string[]).includes(value);
}

/** Stripe price id per card plan (monthly, EUR, VAT added on top). */
export type StripePrices = Record<CardPlanId, string>;

export type StripeSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

/** The parts of a Stripe subscription Zalmox reads. */
export type StripeSubscriptionSnapshot = {
  id: string;
  status: StripeSubscriptionStatus;
  customer: string;
  priceId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  tenantId: string | null;
};

export type TenantBillingState = {
  planId: PlanId;
  isPaying: boolean;
  subscriptionStatus: StripeSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function planForPrice(priceId: string | null, prices: StripePrices): CardPlanId | null {
  if (!priceId) return null;
  for (const plan of CARD_PLANS) if (prices[plan] === priceId) return plan;
  return null;
}

/**
 * The plan a subscription gives. Active and trialing subscriptions give their
 * plan; past_due keeps it while Stripe retries the card; anything else
 * (cancelled, unpaid, never paid, paused) is back on Basic. A price Zalmox does
 * not know gives nothing, so a mistake in Stripe never hands out a plan.
 */
export function billingStateFromSubscription(
  sub: StripeSubscriptionSnapshot,
  prices: StripePrices,
): TenantBillingState {
  const plan = planForPrice(sub.priceId, prices);
  const keepsPlan =
    sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  const paid = keepsPlan && plan != null;
  return {
    planId: paid ? plan : "free",
    isPaying: paid,
    subscriptionStatus: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

/** Whether the tenant already pays by card (then plan changes go through the portal). */
export function hasLiveSubscription(status: string | null | undefined): boolean {
  return (
    status === "active" || status === "trialing" || status === "past_due" || status === "incomplete"
  );
}

/** What the billing page says about how the plan is paid. */
export type BillingSituation =
  | { kind: "free" }
  | { kind: "card"; renewsOn: string | null }
  | { kind: "cancelling"; endsOn: string | null }
  | { kind: "payment_failed" }
  | { kind: "pending" }
  | { kind: "manual" };

export function billingSituation(tenant: {
  planId: string;
  isPaying: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}): BillingSituation {
  const status = tenant.subscriptionStatus;
  if (status === "past_due" || status === "unpaid") return { kind: "payment_failed" };
  if (status === "incomplete") return { kind: "pending" };
  if (status === "active" || status === "trialing") {
    return tenant.cancelAtPeriodEnd
      ? { kind: "cancelling", endsOn: tenant.currentPeriodEnd }
      : { kind: "card", renewsOn: tenant.currentPeriodEnd };
  }
  if (tenant.planId !== "free") return { kind: "manual" };
  return { kind: "free" };
}
