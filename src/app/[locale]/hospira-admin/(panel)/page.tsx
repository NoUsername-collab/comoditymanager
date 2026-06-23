import { getTranslations } from "next-intl/server";
import { getPlatformStats } from "@/services/platform-admin";
import { getPlatformInfraHealth } from "@/lib/hospira-admin/platform-health";
import { Link } from "@/i18n/navigation";
import { PlatformHealthStrip } from "@/components/hospira-admin/PlatformHealthStrip";

export default async function HospiraAdminDashboard() {
  const t = await getTranslations("hospiraAdmin.dashboard");
  const [stats, infraHealth] = await Promise.all([
    getPlatformStats(),
    getPlatformInfraHealth(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>

      <PlatformHealthStrip health={infraHealth} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t("totalTenants")} value={stats.totalTenants} />
        <StatCard
          label={t("activeTenants")}
          value={stats.activeTenants}
          accent="text-emerald-400"
        />
        <StatCard
          label={t("trialTenants")}
          value={stats.trialTenants}
          accent="text-amber-400"
        />
        <StatCard
          label={t("signupsLast7d")}
          value={stats.signupsLast7d}
          accent="text-lime-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t("mrr")} value={`${stats.mrr}€`} accent="text-sky-400" />
        <StatCard label={t("totalRooms")} value={stats.totalRooms} />
        <StatCard label={t("totalBookings")} value={stats.totalBookings} />
        <StatCard
          label={t("bookingsToday")}
          value={stats.bookingsCreatedToday}
          accent="text-violet-400"
        />
        <StatCard
          label={t("activeStaysToday")}
          value={stats.activeStaysToday}
          accent="text-cyan-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("suspendedTenants")}
          value={stats.suspendedTenants}
          accent={
            stats.suspendedTenants > 0 ? "text-red-400" : "text-neutral-500"
          }
        />
        <StatCard
          label={t("cancelledTenants")}
          value={stats.cancelledTenants}
          accent="text-neutral-500"
        />
        <StatCard
          label={t("errors24h")}
          value={stats.recentErrors24h}
          accent={
            stats.recentErrors24h > 0 ? "text-red-400" : "text-neutral-500"
          }
        />
        <StatCard
          label={t("planTypes")}
          value={Object.keys(stats.planDistribution).length}
        />
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-2 text-base font-semibold">{t("planDistribution")}</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.planDistribution).map(([plan, count]) => (
            <div
              key={plan}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2"
            >
              <span className="text-sm font-medium capitalize text-neutral-200">
                {plan}
              </span>
              <span className="ml-2 text-lg font-bold text-white">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/hospira-admin/tenants"
          className="hospira-dashboard__cta inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
        >
          {t("viewAllTenants")} →
        </Link>
        <Link
          href="/hospira-admin/tools"
          className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
        >
          {t("openTools")} →
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${accent ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
