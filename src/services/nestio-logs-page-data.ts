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

export type NestioLogFilterOption = {
  id: string;
  slug: string;
  displayName: string;
};

export type NestioLogsPageData = {
  healthChecks: TenantHealthCheck[];
  activityLogs: PlatformLogEntry[];
  devLogs: PlatformDevLogEntry[];
  filterOptions: NestioLogFilterOption[];
  activeTenantName: string | null;
};

/** Persistă în dev_logs apoi re-aruncă cu prefix de secțiune (testabil). */
export async function captureAndThrowNestioLogsSectionError(
  section: string,
  error: unknown
): Promise<never> {
  try {
    await capturePlatformAdminError(error, {
      source: `nestio-logs:${section}`,
      context: { section },
    });
  } catch (logError) {
    throw logError;
  }

  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`[nestio-admin/logs:${section}] ${detail}`, { cause: error });
}

export const loadNestioLogsPageData = cache(async (
  tenantFilter: string | null,
  limit = 100
): Promise<NestioLogsPageData> => {
  const [healthChecks, logBundle, filterOptions] = await Promise.all([
    runTenantHealthChecks().catch((error) =>
      captureAndThrowNestioLogsSectionError("health-checks", error)
    ),
    getPlatformLogsBundle(limit, tenantFilter).catch((error) =>
      captureAndThrowNestioLogsSectionError("platform-logs", error)
    ),
    listTenantFilterOptions().catch((error) =>
      captureAndThrowNestioLogsSectionError("tenant-filters", error)
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
