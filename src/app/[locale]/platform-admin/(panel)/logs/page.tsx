import { getTranslations } from "next-intl/server";
import { PlatformActivityLogTable } from "@/features/platform-admin/ui/PlatformActivityLogTable";
import { PlatformDevLogTable } from "@/features/platform-admin/ui/PlatformDevLogTable";
import { LogsProbeButton } from "@/features/platform-admin/ui/LogsProbeButton";
import { TenantHealthPanel } from "@/features/platform-admin/ui/TenantHealthPanel";
import { probePlatformLogsPageThrow } from "@/features/platform-admin/logs-actions";
import { loadPlatformLogsPage } from "@/features/platform-admin/loaders";

import "@/styles/features/admin/admin-devlog.css";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; throw?: string }>;
}) {
  const params = await searchParams;

  if (
    process.env.NODE_ENV !== "production" &&
    (params.throw === "page" || params.throw === "1")
  ) {
    await probePlatformLogsPageThrow();
  }

  const [pageData, t] = await Promise.all([
    loadPlatformLogsPage(params.tenant || null),
    getTranslations("platformAdmin.logsPage"),
  ]);

  const {
    healthChecks,
    activityLogs,
    devLogs,
    filterOptions,
    activeTenantName,
  } = pageData;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <LogsProbeButton />
      </div>

      <TenantHealthPanel healthChecks={healthChecks} />

      <PlatformActivityLogTable
        logs={activityLogs}
        filterOptions={filterOptions}
        activeTenantName={activeTenantName}
      />

      <PlatformDevLogTable logs={devLogs} />
    </div>
  );
}
