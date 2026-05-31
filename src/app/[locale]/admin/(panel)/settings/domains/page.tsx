import { Link } from "@/i18n/navigation";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminTenantDomainsPanel } from "@/components/admin/settings/AdminTenantDomainsPanel";
import { allowedCustomRoutingKindsForPlan } from "@/lib/tenant/domain-routing";
import { platformDomainFromRequestHost } from "@/lib/tenant/host";
import { getActiveTenantIdForData, resolveRequestTenant } from "@/lib/tenant/active";
import { requireStaff } from "@/lib/auth/require-staff";
import { PLAN_CONFIGS, type CoreFeature, type PlanId } from "@/core/config/plans";
import { listTenantDomains } from "@/services/tenant-domains";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

export default async function SettingsDomainsPage() {
  const t = await getTranslations("admin.domains");
  await requireStaff();

  const tenant = await resolveRequestTenant();
  const tenantId = await getActiveTenantIdForData();
  const domains = await listTenantDomains(tenantId);

  const requestHost =
    (await headers()).get("x-forwarded-host") ??
    (await headers()).get("host");
  const platformDomain = platformDomainFromRequestHost(requestHost);

  const planId = tenant?.plan_id ?? "free";
  const plan = PLAN_CONFIGS[planId as PlanId];
  const canManageCustom =
    plan?.coreFeatures.includes("custom_domain" as CoreFeature) ?? false;
  const allowedKinds = allowedCustomRoutingKindsForPlan(planId);

  return (
    <AdminRetroPageFrame
      title={t("pageTitle")}
      description={t("pageDescription")}
      className="admin-settings-page w-full max-w-2xl px-4 py-6 sm:px-6"
    >
      <Link
        href="/admin/settings"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        {t("backToSettings")}
      </Link>

      <AdminTenantDomainsPanel
        domains={domains}
        tenantSlug={tenant?.slug ?? "tenant"}
        platformDomain={platformDomain}
        allowedKinds={allowedKinds}
        canManageCustom={canManageCustom}
      />
    </AdminRetroPageFrame>
  );
}
