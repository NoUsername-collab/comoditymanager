import {
  DEV_FALLBACK_TENANT,
  resetTenantContext,
  setTenantContext,
  type TenantContext,
} from "@/core/tenant/context";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { tenantRowToRecord } from "@/lib/tenant/record";
import { getTenantBySlug } from "@/services/tenants";

/**
 * Bind tenant context for the current request from host headers / DB.
 * Production: host tenant only — never "first row in tenants table".
 */
export async function bindTenantContextFromRequest(): Promise<TenantContext> {
  resetTenantContext();

  const fromHost = await resolveRequestTenant();
  if (fromHost) {
    return setTenantContext(tenantRowToRecord(fromHost));
  }

  if (process.env.NODE_ENV === "development") {
    const devSlug = process.env.DEV_TENANT_SLUG?.trim();
    if (devSlug) {
      const row = await getTenantBySlug(devSlug);
      if (row) {
        return setTenantContext(tenantRowToRecord(row));
      }
    }
    return setTenantContext(DEV_FALLBACK_TENANT);
  }

  throw new Error("auth.tenant_host_required");
}
