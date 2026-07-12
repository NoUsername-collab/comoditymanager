import { getTranslations } from "next-intl/server";
import { HEALTH_ICON } from "@/lib/platform-admin/log-styles";
import { Link } from "@/i18n/navigation";
import type { TenantHealthCheck } from "@/services/platform-debug";

export async function TenantHealthPanel({
  healthChecks,
}: {
  healthChecks: TenantHealthCheck[];
}) {
  const t = await getTranslations("platformAdmin.logsPage.health");
  const unhealthy = healthChecks.filter((check) => !check.healthy);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <h2 className="mb-2 text-base font-semibold">
        {t("title")}
        {unhealthy.length > 0 && (
          <span className="ml-2 rounded-full bg-red-900 px-2 py-0.5 text-xs text-red-300">
            {t("issuesCount", { count: unhealthy.length })}
          </span>
        )}
        {unhealthy.length === 0 && (
          <span className="ml-2 platform-status-badge platform-status-badge--active">
            {t("allOk")}
          </span>
        )}
      </h2>

      <div className="platform-health-list max-h-[min(70dvh,36rem)] space-y-2 overflow-y-auto pr-1">
        {healthChecks.map((check) => (
          <div
            key={check.tenantId}
            className={`platform-health-row flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              check.healthy
                ? "bg-neutral-800/50"
                : "border border-red-900/50 bg-red-950/20"
            }`}
          >
            <span className="platform-health-row__icon shrink-0">
              {HEALTH_ICON[String(check.healthy)]}
            </span>
            <div className="platform-health-row__body min-w-0 flex-1">
              <div className="platform-health-row__title flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Link
                  href={`/platform-admin/tenants/${check.tenantId}`}
                  className="font-medium text-white hover:text-sky-300"
                >
                  {check.displayName}
                </Link>
                <span className="font-mono text-xs text-neutral-500">{check.slug}</span>
              </div>
              <div className="platform-health-row__meta mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                <span className="text-neutral-400">
                  {t("meta", {
                    buildings: check.buildingCount,
                    rooms: check.roomCount,
                    members: check.memberCount,
                  })}
                </span>
                {check.issues.length > 0 && (
                  <span className="text-red-400">{check.issues.join(" · ")}</span>
                )}
                <Link
                  href={`/platform-admin/logs?tenant=${check.tenantId}`}
                  className="text-sky-400 hover:text-sky-300"
                >
                  {t("viewLogs")}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
