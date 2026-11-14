"use server";

import { getLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { requestOrigin } from "@/lib/tenant/site-url";
import { isCardPlan } from "@/domain/billing/subscription";
import { createBillingPortal, createSubscriptionCheckout } from "@/services/billing";

type Fail = {
  ok: false;
  error: "owner_only" | "invalid_plan" | "not_configured" | "already_subscribed" | "manual_plan" | "no_customer" | "stripe_error";
};

async function ownerContext() {
  const { memberRole } = await requireStaff();
  if (memberRole !== "owner") return null;
  const [tenantId, origin, locale] = await Promise.all([resolveTenantIdForData(), requestOrigin(), getLocale()]);
  const prefix = locale === "ro" ? "" : `/${locale}`;
  return { tenantId, locale, returnUrl: `${origin}${prefix}/admin/settings/billing` };
}

/** Opens Stripe Checkout for Light or PRO. Owner only. */
export async function startSubscriptionCheckoutAction(plan: string): Promise<{ ok: true; url: string } | Fail> {
  const ctx = await ownerContext();
  if (!ctx) return { ok: false, error: "owner_only" };
  if (!isCardPlan(plan)) return { ok: false, error: "invalid_plan" };
  try {
    return await createSubscriptionCheckout({ ...ctx, plan });
  } catch (error) {
    console.error("[billing] checkout failed", error);
    return { ok: false, error: "stripe_error" };
  }
}

/** Opens Stripe's customer portal (card, invoices, plan, cancelling). Owner only. */
export async function openBillingPortalAction(): Promise<{ ok: true; url: string } | Fail> {
  const ctx = await ownerContext();
  if (!ctx) return { ok: false, error: "owner_only" };
  try {
    return await createBillingPortal(ctx);
  } catch (error) {
    console.error("[billing] portal failed", error);
    return { ok: false, error: "stripe_error" };
  }
}
