import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getPlatformTenantById,
  getTenantLastActivity,
} from "@/services/platform-admin";
import { getTenantHealthCheck } from "@/services/platform-debug";
import { listTenantDomains } from "@/services/tenant-domains";
import { PLAN_CONFIGS, type PlanId } from "@/core/config/plans";
import { TenantPlanForm } from "@/components/platform-admin/TenantPlanForm";
import { TenantStatusForm } from "@/components/platform-admin/TenantStatusForm";
import { TenantModulesForm } from "@/components/platform-admin/TenantModulesForm";
import { TenantBillingToggle } from "@/components/platform-admin/TenantBillingToggle";
import { TenantQuickLinks } from "@/components/platform-admin/TenantQuickLinks";
import { TenantHealthBadge } from "@/components/platform-admin/TenantHealthBadge";
import { TenantDomainsPanel } from "@/components/platform-admin/TenantDomainsPanel";
import { TenantSupportTools } from "@/components/platform-admin/TenantSupportTools";
import {
  TenantActivityPanel,
  TenantSiteLinksPanel,
} from "@/components/platform-admin/TenantDetailExtras";
import { Link } from "@/i18n/navigation";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tenant, health, domains, activity, t] = await Promise.all([
    getPlatformTenantById(id),
    getTenantHealthCheck(id),
    listTenantDomains(id),
    getTenantLastActivity(id),
    getTranslations("platformAdmin.tenantDetail"),
  ]);

  if (!tenant) notFound();

  const currentPlan = PLAN_CONFIGS[(tenant.plan_id || "free") as PlanId];

  return (
    <div className="platform-tenant-detail space-y-4">
      <div className="platform-tenant-detail__head flex items-center gap-4">
        <Link
          href="/platform-admin/tenants"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← {t("backToTenants")}
        </Link>
        <h1 className="text-xl font-bold">{tenant.display_name}</h1>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium capitalize text-neutral-300">
          {tenant.slug}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            {t("info")}
          </h2>
          <InfoRow label={t("id")} value={tenant.id} mono />
          <InfoRow label={t("slug")} value={tenant.slug} />
          <InfoRow label={t("ownerEmail")} value={tenant.owner_email || "—"} />
          <InfoRow label={t("country")} value={tenant.country || "RO"} />
          <InfoRow label={t("locale")} value={tenant.locale || "ro"} />
          <InfoRow label={t("timezone")} value={tenant.timezone || "Europe/Bucharest"} />
          <InfoRow
            label={t("created")}
            value={new Date(tenant.created_at).toLocaleString("ro")}
          />
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-2">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            {t("stats")}
          </h2>
          <InfoRow label={t("rooms")} value={String(tenant.room_count)} />
          <InfoRow label={t("bookings")} value={String(tenant.booking_count)} />
          <InfoRow label={t("teamMembers")} value={String(tenant.member_count)} />
          <InfoRow
            label={t("planPrice")}
            value={currentPlan ? `${currentPlan.priceEur}€/${t("month")}` : "—"}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">{t("billing")}</span>
            <TenantBillingToggle tenantId={tenant.id} isPaying={tenant.is_paying ?? false} />
          </div>
          <InfoRow
            label={t("maxRoomsPlan")}
            value={
              currentPlan
                ? currentPlan.maxRooms === Infinity
                  ? t("unlimited")
                  : String(currentPlan.maxRooms)
                : "—"
            }
          />
        </div>

        <TenantQuickLinks tenantId={tenant.id} slug={tenant.slug} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TenantDomainsPanel domains={domains} slug={tenant.slug} />
        <TenantActivityPanel activity={activity} />
        <TenantSiteLinksPanel slug={tenant.slug} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TenantSupportTools
          tenantId={tenant.id}
          ownerEmail={tenant.owner_email}
        />
      </div>

      {health && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TenantHealthBadge health={health} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
          <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">
            {t("plan")}
          </h2>
          <TenantPlanForm
            tenantId={tenant.id}
            currentPlan={(tenant.plan_id || "free") as PlanId}
          />
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
          <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">
            {t("status")}
          </h2>
          <TenantStatusForm
            tenantId={tenant.id}
            currentStatus={tenant.status}
          />
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
          <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">
            {t("modules")}
          </h2>
          <TenantModulesForm
            tenantId={tenant.id}
            currentModules={tenant.active_modules || []}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="platform-tenant-detail__info-row flex items-baseline justify-between gap-2">
      <span className="text-xs text-neutral-500">{label}</span>
      <span
        className={`text-sm text-neutral-200 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
