import { HEALTH_ICON } from "@/lib/hospira-admin/log-styles";
import { Link } from "@/i18n/navigation";
import type { TenantHealthCheck } from "@/services/platform-debug";

export function TenantHealthPanel({
  healthChecks,
}: {
  healthChecks: TenantHealthCheck[];
}) {
  const unhealthy = healthChecks.filter((check) => !check.healthy);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <h2 className="mb-2 text-base font-semibold">
        Sănătate tenanți
        {unhealthy.length > 0 && (
          <span className="ml-2 rounded-full bg-red-900 px-2 py-0.5 text-xs text-red-300">
            {unhealthy.length} probleme
          </span>
        )}
        {unhealthy.length === 0 && (
          <span className="ml-2 hospira-status-badge hospira-status-badge--active">
            Toți OK
          </span>
        )}
      </h2>

      <div className="hospira-health-list max-h-[min(70dvh,36rem)] space-y-2 overflow-y-auto pr-1">
        {healthChecks.map((check) => (
          <div
            key={check.tenantId}
            className={`hospira-health-row flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              check.healthy
                ? "bg-neutral-800/50"
                : "border border-red-900/50 bg-red-950/20"
            }`}
          >
            <span className="hospira-health-row__icon shrink-0">
              {HEALTH_ICON[String(check.healthy)]}
            </span>
            <div className="hospira-health-row__body min-w-0 flex-1">
              <div className="hospira-health-row__title flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Link
                  href={`/hospira-admin/tenants/${check.tenantId}`}
                  className="font-medium text-white hover:text-sky-300"
                >
                  {check.displayName}
                </Link>
                <span className="font-mono text-xs text-neutral-500">{check.slug}</span>
              </div>
              <div className="hospira-health-row__meta mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                <span className="text-neutral-400">
                  {check.buildingCount}B · {check.roomCount}C · {check.memberCount}M
                </span>
                {check.issues.length > 0 && (
                  <span className="text-red-400">{check.issues.join(" · ")}</span>
                )}
                <Link
                  href={`/hospira-admin/logs?tenant=${check.tenantId}`}
                  className="text-sky-400 hover:text-sky-300"
                >
                  logs →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
