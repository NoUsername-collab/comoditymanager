import "@/app/admin/admin-devlog.css";
import { PlatformActivityLogTable } from "@/components/hospira-admin/PlatformActivityLogTable";
import { PlatformDevLogTable } from "@/components/hospira-admin/PlatformDevLogTable";
import { HospiraLogsProbeButton } from "@/components/hospira-admin/HospiraLogsProbeButton";
import { TenantHealthPanel } from "@/components/hospira-admin/TenantHealthPanel";
import { probeHospiraLogsPageThrow } from "@/app/[locale]/hospira-admin/(panel)/actions/logs-actions";
import { loadHospiraLogsPageData } from "@/services/hospira-logs-page-data";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; throw?: string }>;
}) {
  const params = await searchParams;

  if (params.throw === "page" || params.throw === "1") {
    await probeHospiraLogsPageThrow();
  }

  const pageData = await loadHospiraLogsPageData(params.tenant || null);
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
        <HospiraLogsProbeButton />
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
