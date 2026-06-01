import {
  getTenantContext,
  TenantContextMissingError,
} from "@/core/tenant/context";
import { getActiveTenantIdForData } from "@/lib/tenant/active";

/**
 * Tenant id for data reads on public + admin routes.
 * Uses bound request context when available; otherwise host headers / default tenant.
 */
export async function resolveTenantIdForData(): Promise<string> {
  try {
    return getTenantContext().tenant.id;
  } catch (e) {
    if (e instanceof TenantContextMissingError) {
      return getActiveTenantIdForData();
    }
    throw e;
  }
}
