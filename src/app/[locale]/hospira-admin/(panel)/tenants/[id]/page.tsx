import { notFound } from "next/navigation";
import { getPlatformTenantById } from "@/services/platform-admin";
import { PLAN_CONFIGS, MODULE_CATALOG, type PlanId } from "@/core/config/plans";
import { TenantPlanForm } from "@/components/hospira-admin/TenantPlanForm";
import { TenantStatusForm } from "@/components/hospira-admin/TenantStatusForm";
import { TenantModulesForm } from "@/components/hospira-admin/TenantModulesForm";
import { TenantImpersonateLink } from "@/components/hospira-admin/TenantImpersonateLink";
import { TenantBillingToggle } from "@/components/hospira-admin/TenantBillingToggle";
import { Link } from "@/i18n/navigation";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getPlatformTenantById(id);
  if (!tenant) notFound();

  const currentPlan = PLAN_CONFIGS[(tenant.plan_id || "free") as PlanId];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="hospira-tenant-detail__head flex items-center gap-4">
        <Link
          href="/hospira-admin/tenants"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← Tenanți
        </Link>
        <h1 className="text-2xl font-bold">{tenant.display_name}</h1>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium capitalize text-neutral-300">
          {tenant.slug}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tenant Info */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            Informații
          </h2>
          <InfoRow label="ID" value={tenant.id} mono />
          <InfoRow label="Slug" value={tenant.slug} />
          <InfoRow label="Email proprietar" value={tenant.owner_email || "—"} />
          <InfoRow label="Țara" value={tenant.country || "RO"} />
          <InfoRow label="Limba" value={tenant.locale || "ro"} />
          <InfoRow label="Timezone" value={tenant.timezone || "Europe/Bucharest"} />
          <InfoRow
            label="Creat"
            value={new Date(tenant.created_at).toLocaleString("ro")}
          />
        </div>

        {/* Stats */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            Statistici
          </h2>
          <InfoRow label="Camere" value={String(tenant.room_count)} />
          <InfoRow label="Rezervări" value={String(tenant.booking_count)} />
          <InfoRow label="Membri echipă" value={String(tenant.member_count)} />
          <InfoRow
            label="Plan preț"
            value={currentPlan ? `${currentPlan.priceEur}€/lună` : "—"}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Billing</span>
            <TenantBillingToggle tenantId={tenant.id} isPaying={tenant.is_paying ?? false} />
          </div>
          <InfoRow
            label="Max camere plan"
            value={
              currentPlan
                ? currentPlan.maxRooms === Infinity
                  ? "Nelimitat"
                  : String(currentPlan.maxRooms)
                : "—"
            }
          />
        </div>

        {/* Impersonate */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            Acțiuni rapide
          </h2>
          <TenantImpersonateLink slug={tenant.slug} />
        </div>
      </div>

      {/* Management */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Plan */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-neutral-500">
            Plan
          </h2>
          <TenantPlanForm
            tenantId={tenant.id}
            currentPlan={(tenant.plan_id || "free") as PlanId}
          />
        </div>

        {/* Status */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-neutral-500">
            Status
          </h2>
          <TenantStatusForm
            tenantId={tenant.id}
            currentStatus={tenant.status}
          />
        </div>

        {/* Modules */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-neutral-500">
            Module add-on
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
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-neutral-500">{label}</span>
      <span
        className={`text-sm text-neutral-200 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
