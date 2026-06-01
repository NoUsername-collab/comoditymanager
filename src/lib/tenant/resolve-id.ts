import { requireTenantIdForData } from "@/lib/tenant/guards";

/**
 * Tenant id for data reads (public calendar + admin).
 * Always aligned with host tenant in production.
 */
export async function resolveTenantIdForData(): Promise<string> {
  return requireTenantIdForData();
}
