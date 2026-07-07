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

export type PlatformLogFilterOption = {
  id: string;
  slug: string;
  displayName: string;
};

export type PlatformLogsPageData = {
  healthChecks: TenantHealthCheck[];
  activityLogs: PlatformLogEntry[];
  devLogs: PlatformDevLogEntry[];
  filterOptions: PlatformLogFilterOption[];
  activeTenantName: string | null;
};

/** Persistă în dev_logs apoi re-aruncă cu prefix de secțiune (testabil). */
export async function captureAndThrowPlatformLogsSectionError(
  section: string,
  error: unknown
): Promise<never> {
  try {
    await capturePlatformAdminError(error, {
      source: `platform-logs:${section}`,
      context: { section },
    });
  } catch (logError) {
    throw logError;
  }

  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`[platform-admin/logs:${section}] ${detail}`, { cause: error });
}

export const loadPlatformLogsPageData = cache(async (
  tenantFilter: string | null,
  limit = 100
): Promise<PlatformLogsPageData> => {
  const [healthChecks, logBundle, filterOptions] = await Promise.all([
    runTenantHealthChecks().catch((error) =>
      captureAndThrowPlatformLogsSectionError("health-checks", error)
    ),
    getPlatformLogsBundle(limit, tenantFilter).catch((error) =>
      captureAndThrowPlatformLogsSectionError("platform-logs", error)
    ),
    listTenantFilterOptions().catch((error) =>
      captureAndThrowPlatformLogsSectionError("tenant-filters", error)
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
