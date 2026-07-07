import "@/app/admin/admin-devlog.css";
import { PlatformActivityLogTable } from "@/components/platform-admin/PlatformActivityLogTable";
import { PlatformDevLogTable } from "@/components/platform-admin/PlatformDevLogTable";
import { LogsProbeButton } from "@/components/platform-admin/LogsProbeButton";
import { TenantHealthPanel } from "@/components/platform-admin/TenantHealthPanel";
import { probePlatformLogsPageThrow } from "@/app/[locale]/platform-admin/(panel)/actions/logs-actions";
import { loadPlatformLogsPageData } from "@/services/platform-logs-page-data";

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

  const pageData = await loadPlatformLogsPageData(params.tenant || null);
  const tenantFilter = params.tenant || null;

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
        <h1 className="text-xl font-bold">Loguri & diagnostic</h1>
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
