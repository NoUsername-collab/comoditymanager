import { getPlatformInfraHealth } from "@/lib/platform-admin/platform-health";
import {
  getPlatformStats,
  getPlatformTenantById,
  getTenantLastActivity,
  listAllTenants,
} from "@/services/platform-admin";
import { getTenantHealthCheck } from "@/services/platform-debug";
import { loadPlatformLogsPageData } from "@/services/platform-logs-page-data";
import { listTenantDomains } from "@/services/tenant-domains";

export async function loadPlatformDashboardPage() {
  const [stats, infraHealth] = await Promise.all([
    getPlatformStats(),
    getPlatformInfraHealth(),
  ]);
  return { stats, infraHealth };
}

export async function loadPlatformTenantsPage() {
  return listAllTenants();
}

export async function loadPlatformTenantDetailPage(id: string) {
  const [tenant, health, domains, activity] = await Promise.all([
    getPlatformTenantById(id),
    getTenantHealthCheck(id),
    listTenantDomains(id),
    getTenantLastActivity(id),
  ]);
  return { tenant, health, domains, activity };
}

export async function loadPlatformLogsPage(tenantFilter: string | null) {
  return loadPlatformLogsPageData(tenantFilter);
}
