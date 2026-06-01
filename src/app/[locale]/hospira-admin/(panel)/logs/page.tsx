import { getPlatformLogs, runTenantHealthChecks } from "@/services/platform-debug";

const HEALTH_ICON: Record<string, string> = {
  true: "🟢",
  false: "🔴",
};

const ACTION_COLOR: Record<string, string> = {
  "auth.login": "text-sky-400",
  "auth.logout": "text-neutral-500",
  "booking.request_created": "text-amber-400",
  "booking.confirmed": "text-emerald-400",
  "booking.cancelled": "text-red-400",
};

export default async function LogsPage() {
  const [healthChecks, logs] = await Promise.all([
    runTenantHealthChecks(),
    getPlatformLogs(100),
  ]);

  const unhealthy = healthChecks.filter((h) => !h.healthy);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Logs & Debug</h1>

      {/* Health Checks */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Sănătate tenanți
          {unhealthy.length > 0 && (
            <span className="ml-2 rounded-full bg-red-900 px-2 py-0.5 text-xs text-red-300">
              {unhealthy.length} probleme
            </span>
          )}
          {unhealthy.length === 0 && (
            <span className="ml-2 rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-300">
              Toți OK
            </span>
          )}
        </h2>

        <div className="space-y-2">
          {healthChecks.map((h) => (
            <div
              key={h.tenantId}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                h.healthy
                  ? "bg-neutral-800/50"
                  : "border border-red-900/50 bg-red-950/20"
              }`}
            >
              <span>{HEALTH_ICON[String(h.healthy)]}</span>
              <span className="font-medium text-white">{h.displayName}</span>
              <span className="font-mono text-xs text-neutral-500">
                {h.slug}
              </span>
              <span className="flex-1" />
              <span className="text-xs text-neutral-400">
                {h.buildingCount}B · {h.roomCount}C · {h.memberCount}M
              </span>
              {h.issues.length > 0 && (
                <span className="text-xs text-red-400">
                  {h.issues.join(" · ")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity Logs */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Activitate recentă
          <span className="ml-2 text-sm font-normal text-neutral-500">
            (ultimele {logs.length})
          </span>
        </h2>

        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 border-b border-neutral-700 bg-neutral-900 text-left uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Când</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Acțiune</th>
                <th className="px-3 py-2">Detalii</th>
                <th className="px-3 py-2">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="transition-colors hover:bg-neutral-800/50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                    {new Date(log.created_at).toLocaleString("ro", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-mono text-neutral-400">
                    {log.tenant_slug}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`font-medium ${ACTION_COLOR[log.action] ?? "text-neutral-300"}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-neutral-400">
                    {log.summary}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">
                    {log.actor_email ?? "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-neutral-500"
                  >
                    Niciun log încă.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
