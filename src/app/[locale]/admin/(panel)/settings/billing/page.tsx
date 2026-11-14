import { getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { BillingPanel } from "@/features/settings/ui/BillingPanel";
import { requireStaff } from "@/lib/auth/require-staff";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getPlanConfig } from "@/core/config/plans";
import { CARD_PLANS, billingSituation, hasLiveSubscription } from "@/domain/billing/subscription";
import { getTenantBilling, isCardPaymentAvailable } from "@/services/billing";

export const dynamic = "force-dynamic";

export default async function SettingsBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ memberRole }, t, tSettings, params] = await Promise.all([
    requireStaff(),
    getTranslations("admin.billing"),
    getTranslations("admin.pages.settings"),
    searchParams,
  ]);
  if (memberRole !== "owner") return redirect("/admin/settings");

  const billing = await getTenantBilling(await resolveTenantIdForData());
  if (!billing) return redirect("/admin/settings");

  const plan = getPlanConfig(billing.planId);
  const situation = billingSituation(billing);
  // Card plans above the current one, while the property neither pays by card nor by arrangement.
  const offers =
    hasLiveSubscription(billing.subscriptionStatus) || situation.kind === "manual"
      ? []
      : CARD_PLANS.filter((id) => id !== billing.planId).map((id) => ({
          id,
          label: getPlanConfig(id).label,
          priceEur: getPlanConfig(id).priceEur,
        }));

  return (
    <SettingsPageLayout title={tSettings("navBilling")} description={tSettings("navBillingDesc")}>
      <SettingsSection title={t("title")} description={t("lead")}>
        <BillingPanel
          planLabel={plan.label}
          situation={situation}
          cardAvailable={isCardPaymentAvailable()}
          hasCustomer={Boolean(billing.stripeCustomerId)}
          offers={offers}
          checkout={params.checkout === "success" || params.checkout === "cancelled" ? params.checkout : null}
        />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
