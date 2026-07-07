import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HEALTH_ICON } from "@/lib/platform-admin/log-styles";
import type { TenantHealthCheck } from "@/services/platform-debug";

export async function TenantHealthBadge({
  health,
}: {
  health: TenantHealthCheck;
}) {
  const t = await getTranslations("platformAdmin.tenantDetail.health");

  return (
    <div
      className={`rounded-lg border p-3.5 ${
        health.healthy
          ? "border-emerald-900/50 bg-emerald-950/20"
          : "border-red-900/50 bg-red-950/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{HEALTH_ICON[String(health.healthy)]}</span>
        <h2 className="text-sm font-semibold text-neutral-200">
          {health.healthy ? t("ok") : t("issues")}
        </h2>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        {health.buildingCount}B · {health.roomCount}C · {health.memberCount}M
      </p>
      {health.issues.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-red-400">
          {health.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      <Link
        href={`/platform-admin/logs?tenant=${health.tenantId}`}
        className="mt-3 inline-flex text-xs text-sky-400 hover:text-sky-300"
      >
        {t("viewLogs")} →
      </Link>
    </div>
  );
}
