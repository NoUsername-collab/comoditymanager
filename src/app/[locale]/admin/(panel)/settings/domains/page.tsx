import { getTranslations } from "next-intl/server";
import { AdminTenantDomainsPanel } from "@/features/settings/ui/AdminTenantDomainsPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { allowedCustomRoutingKindsForPlan } from "@/lib/tenant/domain-routing";
import { platformDomainFromRequestHost } from "@/lib/tenant/host";
import { getActiveTenantIdForData, resolveRequestTenant } from "@/lib/tenant/active";
import { PLAN_CONFIGS, type CoreFeature, type PlanId } from "@/core/config/plans";
import { listTenantDomains } from "@/services/tenant-domains";
import { headers } from "next/headers";
import { guardSettingsPermission } from "@/lib/settings/page-context";

export default async function SettingsDomainsPage() {
  const [t, , tenant, domains, requestHeaders] = await Promise.all([
    getTranslations("admin.domains"),
    guardSettingsPermission("pension_settings"),
    resolveRequestTenant(),
    getActiveTenantIdForData().then((id) => listTenantDomains(id)),
    headers(),
  ]);

  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const platformDomain = platformDomainFromRequestHost(requestHost);

  const planId = tenant?.plan_id ?? "free";
  const plan = PLAN_CONFIGS[planId as PlanId];
  const canManageCustom =
    plan?.coreFeatures.includes("custom_domain" as CoreFeature) ?? false;
  const allowedKinds = allowedCustomRoutingKindsForPlan(planId);

  return (
    <SettingsPageLayout title={t("pageTitle")} description={t("pageDescription")}>
      <AdminTenantDomainsPanel
        domains={domains}
        tenantSlug={tenant?.slug ?? "tenant"}
        platformDomain={platformDomain}
        allowedKinds={allowedKinds}
        canManageCustom={canManageCustom}
      />
    </SettingsPageLayout>
  );
}
