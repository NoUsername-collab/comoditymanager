import { listAllTenants } from "@/services/platform-admin";
import { Link } from "@/i18n/navigation";
import { HospiraTenantsMobileCards } from "@/components/hospira-admin/HospiraTenantsMobileCards";
import { TenantBillingToggle } from "@/components/hospira-admin/TenantBillingToggle";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-900 text-emerald-300",
  trial: "bg-amber-900 text-amber-300",
  suspended: "bg-red-900 text-red-300",
  cancelled: "bg-neutral-800 text-neutral-400",
};

export default async function TenantsListPage() {
  const tenants = await listAllTenants();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tenanți ({tenants.length})</h1>
      </div>

      <HospiraTenantsMobileCards tenants={tenants} />

      <div className="hospira-tenant-table-desktop max-h-[min(75dvh,40rem)] overflow-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Pensiune</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Camere</th>
              <th className="px-3 py-2 text-right">Rezervări</th>
              <th className="px-3 py-2 text-right">Membri</th>
              <th className="px-3 py-2">Billing</th>
              <th className="px-3 py-2">Creat</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {tenants.map((t) => (
              <tr
                key={t.id}
                className="hospira-tenant-row transition-colors hover:bg-neutral-900/50"
              >
                <td className="px-3 py-2 font-medium text-white">
                  {t.display_name}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-neutral-400">
                  {t.slug}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium capitalize text-neutral-300">
                    {t.plan_id || "free"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status] ?? STATUS_BADGE.cancelled}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-neutral-300">
                  {t.room_count}
                </td>
                <td className="px-3 py-2 text-right text-neutral-300">
                  {t.booking_count}
                </td>
                <td className="px-3 py-2 text-right text-neutral-300">
                  {t.member_count}
                </td>
                <td className="px-3 py-2">
                  <TenantBillingToggle tenantId={t.id} isPaying={t.is_paying ?? false} />
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500">
                  {new Date(t.created_at).toLocaleDateString("ro")}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/hospira-admin/tenants/${t.id}`}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    Detalii →
                  </Link>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-4 text-center text-neutral-500"
                >
                  Niciun tenant înregistrat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
