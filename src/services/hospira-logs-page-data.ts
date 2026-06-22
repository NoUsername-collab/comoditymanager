import { cache } from "react";
import {
  getPlatformLogsBundle,
  runTenantHealthChecks,
  type PlatformDevLogEntry,
  type PlatformLogEntry,
  type TenantHealthCheck,
} from "@/services/platform-debug";
import { listTenantFilterOptions } from "@/services/platform-admin";
import { capturePlatformAdminError } from "@/services/dev-logs";

export type HospiraLogFilterOption = {
  id: string;
  slug: string;
  displayName: string;
};

export type HospiraLogsPageData = {
  healthChecks: TenantHealthCheck[];
  activityLogs: PlatformLogEntry[];
  devLogs: PlatformDevLogEntry[];
  filterOptions: HospiraLogFilterOption[];
  activeTenantName: string | null;
};

/** Persistă în dev_logs apoi re-aruncă cu prefix de secțiune (testabil). */
export async function captureAndThrowHospiraLogsSectionError(
  section: string,
  error: unknown
): Promise<never> {
  try {
    await capturePlatformAdminError(error, {
      source: `hospira-logs:${section}`,
      context: { section },
    });
  } catch (logError) {
    throw logError;
  }

  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`[hospira-admin/logs:${section}] ${detail}`, { cause: error });
}

export const loadHospiraLogsPageData = cache(async (
  tenantFilter: string | null,
  limit = 100
): Promise<HospiraLogsPageData> => {
  const [healthChecks, logBundle, filterOptions] = await Promise.all([
    runTenantHealthChecks().catch((error) =>
      captureAndThrowHospiraLogsSectionError("health-checks", error)
    ),
    getPlatformLogsBundle(limit, tenantFilter).catch((error) =>
      captureAndThrowHospiraLogsSectionError("platform-logs", error)
    ),
    listTenantFilterOptions().catch((error) =>
      captureAndThrowHospiraLogsSectionError("tenant-filters", error)
    ),
  ]);

  const activeTenantName = tenantFilter
    ? filterOptions.find((tenant) => tenant.id === tenantFilter)?.displayName ??
      "?"
    : null;

  return {
    healthChecks,
    activityLogs: logBundle.activity,
    devLogs: logBundle.dev,
    filterOptions,
    activeTenantName,
  };
});
