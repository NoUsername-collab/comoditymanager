import {
  getTenantContext,
  TenantContextMissingError,
} from "@/core/tenant/context";
import { getActiveTenantIdForData, resolveRequestTenant } from "@/lib/tenant/active";

/**
 * Tenant id for data reads on public + admin routes.
 * Host tenant (subdomeniu) are prioritate față de context dev/fallback — altfel
 * assertStaffTenantAccess și query-urile folosesc ID-uri diferite.
 */
export async function resolveTenantIdForData(): Promise<string> {
  const fromHost = await resolveRequestTenant();
  if (fromHost) return fromHost.id;

  try {
    return getTenantContext().tenant.id;
  } catch (e) {
    if (e instanceof TenantContextMissingError) {
      return getActiveTenantIdForData();
    }
    throw e;
  }
}
