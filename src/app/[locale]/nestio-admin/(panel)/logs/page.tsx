import "@/app/admin/admin-devlog.css";
import { PlatformActivityLogTable } from "@/components/nestio-admin/PlatformActivityLogTable";
import { PlatformDevLogTable } from "@/components/nestio-admin/PlatformDevLogTable";
import { NestioLogsProbeButton } from "@/components/nestio-admin/NestioLogsProbeButton";
import { TenantHealthPanel } from "@/components/nestio-admin/TenantHealthPanel";
import { probeNestioLogsPageThrow } from "@/app/[locale]/nestio-admin/(panel)/actions/logs-actions";
import { loadNestioLogsPageData } from "@/services/nestio-logs-page-data";

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
    await probeNestioLogsPageThrow();
  }

  const pageData = await loadNestioLogsPageData(params.tenant || null);
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
        <NestioLogsProbeButton />
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
