import {
  DEV_FALLBACK_TENANT,
  getTenantContext,
  setTenantContext,
  TenantContextMissingError,
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

/**
 * Idempotent bind — safe when only a page RSC re-runs (client nav / refresh)
 * and the admin layout did not re-execute bindTenantContextFromRequest().
 */
export async function ensureTenantContextFromRequest(): Promise<TenantContext> {
  try {
    return getTenantContext();
  } catch (error) {
    if (!(error instanceof TenantContextMissingError)) {
      throw error;
    }
    return bindTenantContextFromRequest();
  }
}

/** Guest/public routes on wrong host — bind when possible, otherwise null. */
export async function tryBindTenantContextFromRequest(): Promise<TenantContext | null> {
  try {
    return await bindTenantContextFromRequest();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("auth.tenant_host_required")
    ) {
      return null;
    }
    throw error;
  }
}
