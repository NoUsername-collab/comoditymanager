import {
  DEV_FALLBACK_TENANT,
  resetTenantContext,
  setTenantContext,
  type TenantContext,
} from "@/core/tenant/context";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { tenantRowToRecord } from "@/lib/tenant/record";
import { getDefaultTenant } from "@/services/tenants";

/**
 * Bind tenant context for the current request from host headers / DB.
 * Call at the start of server layouts and server actions that use feature gates.
 */
export async function bindTenantContextFromRequest(): Promise<TenantContext> {
  resetTenantContext();

  const fromHost = await resolveRequestTenant();
  if (fromHost) {
    return setTenantContext(tenantRowToRecord(fromHost));
  }

  const defaultRow = await getDefaultTenant();
  if (defaultRow) {
    return setTenantContext(tenantRowToRecord(defaultRow));
  }

  if (process.env.NODE_ENV === "development") {
    return setTenantContext(DEV_FALLBACK_TENANT);
  }

  throw new Error("No tenant configured for this host");
}
