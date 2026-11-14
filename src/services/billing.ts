import { revalidateTag } from "next/cache";
import {
  billingStateFromSubscription,
  hasLiveSubscription,
  type CardPlanId,
  type StripeSubscriptionSnapshot,
  type StripeSubscriptionStatus,
} from "@/domain/billing/subscription";
import { getStripeConfig, stripeRequest, type StripeConfig } from "@/lib/billing/stripe";
import { createPublicAdminClient } from "@/lib/supabase/admin";

/*
 * Card payment for Light and PRO through Stripe Billing. The owner pays in
 * Stripe Checkout and manages the card, plan and cancelling in Stripe's
 * customer portal; Stripe's webhook then moves the property to its plan.
 * Stripe Tax adds VAT (reverse charge for EU companies with a valid VAT id)
 * and Stripe issues the invoices.
 */

export type TenantBillingRecord = {
  id: string;
  slug: string;
  displayName: string;
  ownerEmail: string | null;
  locale: string | null;
  planId: string;
  isPaying: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const BILLING_COLUMNS =
  "id, slug, display_name, owner_email, locale, plan_id, is_paying, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end";

function mapBilling(row: Record<string, unknown>): TenantBillingRecord {
  return {
    id: row.id as string,
    slug: row.slug as string,
    displayName: (row.display_name as string) ?? "",
    ownerEmail: (row.owner_email as string | null) ?? null,
    locale: (row.locale as string | null) ?? null,
    planId: (row.plan_id as string) ?? "free",
    isPaying: Boolean(row.is_paying),
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    subscriptionStatus: (row.subscription_status as string | null) ?? null,
    currentPeriodEnd: (row.subscription_current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(row.subscription_cancel_at_period_end),
  };
}

export async function getTenantBilling(tenantId: string): Promise<TenantBillingRecord | null> {
  const { data, error } = await createPublicAdminClient()
    .from("tenants")
    .select(BILLING_COLUMNS)
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBilling(data) : null;
}

export function isCardPaymentAvailable(): boolean {
  return getStripeConfig() != null;
}

type CheckoutError = "not_configured" | "already_subscribed" | "manual_plan";

/** A Stripe Checkout page for the plan; the owner is sent there to pay. */
export async function createSubscriptionCheckout(input: {
  tenantId: string;
  plan: CardPlanId;
  returnUrl: string;
  locale: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: CheckoutError }> {
  const config = getStripeConfig();
  if (!config) return { ok: false, error: "not_configured" };
  const tenant = await getTenantBilling(input.tenantId);
  if (!tenant) throw new Error("tenant.not_found");
  if (hasLiveSubscription(tenant.subscriptionStatus)) return { ok: false, error: "already_subscribed" };
  // A plan set by the Zalmox team (Business, or paid by transfer) is changed by the team.
  if (tenant.isPaying && !tenant.stripeSubscriptionId) return { ok: false, error: "manual_plan" };

  const session = await stripeRequest<{ url: string }>(config, "POST", "/checkout/sessions", {
    mode: "subscription",
    line_items: [{ price: config.prices[input.plan], quantity: 1 }],
    success_url: `${input.returnUrl}?checkout=success`,
    cancel_url: `${input.returnUrl}?checkout=cancelled`,
    client_reference_id: tenant.id,
    ...(tenant.stripeCustomerId
      ? { customer: tenant.stripeCustomerId, customer_update: { address: "auto", name: "auto" } }
      : { customer_email: tenant.ownerEmail ?? undefined }),
    metadata: { tenant_id: tenant.id, plan_id: input.plan },
    subscription_data: { metadata: { tenant_id: tenant.id, plan_id: input.plan } },
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    allow_promotion_codes: true,
    locale: ["ro", "bg", "en"].includes(input.locale) ? input.locale : "auto",
  });
  return { ok: true, url: session.url };
}

/** Stripe's customer portal: card, invoices, switching between Light and PRO, cancelling. */
export async function createBillingPortal(input: {
  tenantId: string;
  returnUrl: string;
  locale: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: "not_configured" | "no_customer" }> {
  const config = getStripeConfig();
  if (!config) return { ok: false, error: "not_configured" };
  const tenant = await getTenantBilling(input.tenantId);
  if (!tenant?.stripeCustomerId) return { ok: false, error: "no_customer" };
  const portal = await stripeRequest<{ url: string }>(config, "POST", "/billing_portal/sessions", {
    customer: tenant.stripeCustomerId,
    return_url: input.returnUrl,
    locale: ["ro", "bg", "en"].includes(input.locale) ? input.locale : "auto",
  });
  return { ok: true, url: portal.url };
}

// ── Webhook ──────────────────────────────────────────────────────────────

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

type RawSubscription = {
  id: string;
  status: StripeSubscriptionStatus;
  customer: string | { id: string };
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id?: string } }[] };
};

function snapshot(sub: RawSubscription): StripeSubscriptionSnapshot {
  return {
    id: sub.id,
    status: sub.status,
    customer: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    priceId: sub.items?.data?.[0]?.price?.id ?? null,
    currentPeriodEnd: sub.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    tenantId: sub.metadata?.tenant_id ?? null,
  };
}

/** The property's cached record is read on every request; drop it so the new plan applies now. */
async function refreshTenantCache(tenantId: string, slug: string) {
  revalidateTag(`tenant-id-${tenantId}`, "max");
  revalidateTag(`tenant-slug-${slug}`, "max");
  revalidateTag(`tenant-slug-status-${slug}`, "max");
  const { data } = await createPublicAdminClient().from("tenant_domains").select("domain").eq("tenant_id", tenantId);
  for (const row of data ?? []) revalidateTag(`tenant-domain-${row.domain as string}`, "max");
}

/** Reads the subscription from Stripe and puts its property on the plan it gives. */
async function syncSubscription(config: StripeConfig, subscriptionId: string, hintTenantId: string | null) {
  const sub = snapshot(
    await stripeRequest<RawSubscription>(config, "GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`),
  );
  const supabase = createPublicAdminClient();

  // The property: the one holding this subscription, else the one named in its metadata, else by customer.
  let tenant: TenantBillingRecord | null = null;
  for (const [column, value] of [
    ["stripe_subscription_id", sub.id],
    ["id", sub.tenantId ?? hintTenantId],
    ["stripe_customer_id", sub.customer],
  ] as const) {
    if (!value) continue;
    const { data, error } = await supabase.from("tenants").select(BILLING_COLUMNS).eq(column, value).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      tenant = mapBilling(data);
      break;
    }
  }
  if (!tenant) {
    console.error("[billing] no property for subscription", sub.id);
    return;
  }

  const state = billingStateFromSubscription(sub, config.prices);
  // An old subscription ending must not undo a newer one the property pays.
  if (
    tenant.stripeSubscriptionId &&
    tenant.stripeSubscriptionId !== sub.id &&
    hasLiveSubscription(tenant.subscriptionStatus) &&
    !state.isPaying
  ) {
    return;
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      plan_id: state.planId,
      is_paying: state.isPaying,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      subscription_status: state.subscriptionStatus,
      subscription_current_period_end: state.currentPeriodEnd,
      subscription_cancel_at_period_end: state.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.id);
  if (error) throw new Error(error.message);
  await refreshTenantCache(tenant.id, tenant.slug);
}

/**
 * Applies one webhook event, once. Subscription and invoice events re-read the
 * subscription from Stripe, so their order does not matter.
 */
export async function applyStripeEvent(event: StripeEvent): Promise<"applied" | "duplicate" | "ignored"> {
  const config = getStripeConfig();
  if (!config) throw new Error("billing.not_configured");
  const supabase = createPublicAdminClient();

  const { error: seenError } = await supabase
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (seenError) {
    if (seenError.code === "23505") return "duplicate";
    throw new Error(seenError.message);
  }

  try {
    const object = event.data.object;
    let subscriptionId: string | null = null;
    let tenantHint: string | null = null;
    switch (event.type) {
      case "checkout.session.completed":
        if (object.mode !== "subscription") return "ignored";
        subscriptionId = (object.subscription as string | null) ?? null;
        tenantHint = (object.client_reference_id as string | null) ?? null;
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        subscriptionId = object.id as string;
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        subscriptionId = (object.subscription as string | null) ?? null;
        break;
      default:
        return "ignored";
    }
    if (!subscriptionId) return "ignored";
    await syncSubscription(config, subscriptionId, tenantHint);
    return "applied";
  } catch (error) {
    // Forget the event so Stripe's retry applies it.
    await supabase.from("stripe_webhook_events").delete().eq("id", event.id);
    throw error;
  }
}
