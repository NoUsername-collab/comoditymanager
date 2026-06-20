import { getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { AdminTenantDomainsPanel } from "@/components/admin/settings/AdminTenantDomainsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { allowedCustomRoutingKindsForPlan } from "@/lib/tenant/domain-routing";
import { platformDomainFromRequestHost } from "@/lib/tenant/host";
import { getActiveTenantIdForData, resolveRequestTenant } from "@/lib/tenant/active";
import { requireStaff } from "@/lib/auth/require-staff";
import { PLAN_CONFIGS, type CoreFeature, type PlanId } from "@/core/config/plans";
import { listTenantDomains } from "@/services/tenant-domains";
import { headers } from "next/headers";

export default async function SettingsDomainsPage() {
  const [t, staff, tenant, domains, requestHeaders] = await Promise.all([
    getTranslations("admin.domains"),
    requireStaff(),
    resolveRequestTenant(),
    getActiveTenantIdForData().then((id) => listTenantDomains(id)),
    headers(),
  ]);

  if (staff.role !== "admin") {
    await redirect("/admin/settings?access=role");
  }

  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const platformDomain = platformDomainFromRequestHost(requestHost);

  const planId = tenant?.plan_id ?? "free";
  const plan = PLAN_CONFIGS[planId as PlanId];
  const canManageCustom =
    plan?.coreFeatures.includes("custom_domain" as CoreFeature) ?? false;
  const allowedKinds = allowedCustomRoutingKindsForPlan(planId);

  return (
    <>
      <SettingsPageHeader title={t("pageTitle")} description={t("pageDescription")} />
      <AdminTenantDomainsPanel
        domains={domains}
        tenantSlug={tenant?.slug ?? "tenant"}
        platformDomain={platformDomain}
        allowedKinds={allowedKinds}
        canManageCustom={canManageCustom}
      />
    </>
  );
}
