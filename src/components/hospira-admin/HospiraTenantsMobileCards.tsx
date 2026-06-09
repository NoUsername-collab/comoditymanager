import { Link } from "@/i18n/navigation";
import { TenantBillingToggle } from "@/components/hospira-admin/TenantBillingToggle";
import type { PlatformTenantSummary } from "@/services/platform-admin";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-900 text-emerald-300",
  trial: "bg-amber-900 text-amber-300",
  suspended: "bg-red-900 text-red-300",
  cancelled: "bg-neutral-800 text-neutral-400",
};

export function HospiraTenantsMobileCards({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  if (tenants.length === 0) {
    return (
      <p className="hospira-tenant-cards hospira-tenant-cards--empty rounded-lg border border-neutral-800 px-4 py-4 text-center text-neutral-500">
        Niciun tenant înregistrat.
      </p>
    );
  }

  return (
    <ul className="hospira-tenant-cards space-y-3">
      {tenants.map((tenant) => (
        <li
          key={tenant.id}
          className="hospira-tenant-card rounded-lg border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">
                {tenant.display_name}
              </p>
              <p className="font-mono text-xs text-neutral-500">{tenant.slug}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[tenant.status] ?? STATUS_BADGE.cancelled}`}
            >
              {tenant.status}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-800 px-2 py-1 capitalize text-neutral-300">
              {tenant.plan_id || "free"}
            </span>
            <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-400">
              {tenant.room_count} camere
            </span>
            <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-400">
              {tenant.booking_count} rez.
            </span>
            <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-400">
              {tenant.member_count} membri
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <TenantBillingToggle
              tenantId={tenant.id}
              isPaying={tenant.is_paying ?? false}
            />
            <Link
              href={`/hospira-admin/tenants/${tenant.id}`}
              className="hospira-tenant-card__detail inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-neutral-700 bg-neutral-800 px-4 text-sm font-medium text-sky-400 hover:bg-neutral-700"
            >
              Detalii →
            </Link>
          </div>

          <p className="mt-2 text-[11px] text-neutral-500">
            Creat {new Date(tenant.created_at).toLocaleDateString("ro")}
          </p>
        </li>
      ))}
    </ul>
  );
}
