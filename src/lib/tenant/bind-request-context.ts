import { cache } from "react";
import {
  DEV_FALLBACK_TENANT,
  getTenantContext,
  setTenantContext,
  TenantContextMissingError,
  type TenantContext,
} from "@/core/tenant/context";
import { resolveRequestTenant, TenantNotFoundError } from "@/lib/tenant/active";
import { parseTenantFromHost } from "@/lib/tenant/host";
import { tenantRowToRecord } from "@/lib/tenant/record";
import { getTenantBySlug } from "@/services/tenants";
import { headers } from "next/headers";

/**
 * Bind tenant context for the current request from host headers / DB.
 * Production: host tenant only — never "first row in tenants table".
 */
export const bindTenantContextFromRequest = cache(async (): Promise<TenantContext> => {
  const fromHost = await resolveRequestTenant();
  if (fromHost) {
    return setTenantContext(tenantRowToRecord(fromHost));
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const parsed = parseTenantFromHost(host);
  if (parsed.type === "tenant") {
    throw new TenantNotFoundError(parsed.slug);
  }
  if (parsed.type === "custom") {
    throw new TenantNotFoundError(parsed.domain);
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
});

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
    if (error instanceof TenantNotFoundError) {
      return null;
    }
    if (
      error instanceof Error &&
      error.message.includes("auth.tenant_host_required")
    ) {
      return null;
    }
    throw error;
  }
}
