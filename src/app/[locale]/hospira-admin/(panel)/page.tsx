import { getPlatformStats } from "@/services/platform-admin";
import { Link } from "@/i18n/navigation";

export default async function HospiraAdminDashboard() {
  const stats = await getPlatformStats();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total tenanți" value={stats.totalTenants} />
        <StatCard
          label="Activi"
          value={stats.activeTenants}
          accent="text-emerald-400"
        />
        <StatCard
          label="Trial"
          value={stats.trialTenants}
          accent="text-amber-400"
        />
        <StatCard
          label="MRR"
          value={`${stats.mrr}€`}
          accent="text-sky-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total camere" value={stats.totalRooms} />
        <StatCard label="Total rezervări" value={stats.totalBookings} />
        <StatCard
          label="Suspendați"
          value={stats.suspendedTenants}
          accent={
            stats.suspendedTenants > 0 ? "text-red-400" : "text-neutral-500"
          }
        />
        <StatCard
          label="Planuri"
          value={Object.keys(stats.planDistribution).length}
        />
      </div>

      {/* Plan Distribution */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Distribuție planuri</h2>
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

      {/* Quick link */}
      <div>
        <Link
          href="/hospira-admin/tenants"
          className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
        >
          Vezi toți tenanții →
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
