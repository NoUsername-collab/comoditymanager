import { getTranslations } from "next-intl/server";
import type { PlatformInfraHealth } from "@/lib/platform-admin/platform-health";

export async function PlatformHealthStrip({
  health,
}: {
  health: PlatformInfraHealth;
}) {
  const t = await getTranslations("platformAdmin.health");

  const emailOk = health.email.configured;
  const domainIssues =
    health.domains.unverified + health.domains.sslPending;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div
        className={`rounded-lg border p-3.5 ${
          emailOk
            ? "border-emerald-900/50 bg-emerald-950/20"
            : "border-amber-900/50 bg-amber-950/20"
        }`}
      >
        <h2 className="text-sm font-semibold text-neutral-200">
          {t("emailTitle")}
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          {emailOk
            ? t("emailConfigured", {
                provider: health.email.provider,
                domain: health.email.mailDomain ?? "—",
              })
            : t("emailNotConfigured")}
        </p>
      </div>

      <div
        className={`rounded-lg border p-3.5 ${
          domainIssues === 0
            ? "border-emerald-900/50 bg-emerald-950/20"
            : "border-amber-900/50 bg-amber-950/20"
        }`}
      >
        <h2 className="text-sm font-semibold text-neutral-200">
          {t("domainsTitle")}
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          {t("domainsSummary", {
            custom: health.domains.customDomains,
            subdomains: health.domains.platformSubdomainsCount,
            unverified: health.domains.unverified,
            sslPending: health.domains.sslPending,
          })}
        </p>
      </div>
    </div>
  );
}
