import { cache } from "react";
import { headers } from "next/headers";
import {
  tenantDomainFromHost,
  tenantSlugFromHost,
} from "@/lib/tenant/host";
import {
  getDefaultTenant,
  getTenantByDomain,
  getTenantBySlug,
  type TenantRow,
} from "@/services/tenants";

export class TenantNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`Tenant not found: ${key}`);
    this.name = "TenantNotFoundError";
  }
}

function requestHost(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    ""
  );
}

/** Tenant from subdomain/custom domain headers (set in proxy.ts) or Host. */
export const resolveRequestTenant = cache(async (): Promise<TenantRow | null> => {
  const h = await headers();
  const slug = h.get("x-tenant-slug")?.trim();
  if (slug) {
    return getTenantBySlug(slug);
  }
  const domain = h.get("x-tenant-domain")?.trim();
  if (domain) {
    return getTenantByDomain(domain);
  }

  const hostSlug = tenantSlugFromHost(requestHost(h));
  if (hostSlug) {
    return getTenantBySlug(hostSlug);
  }

  const hostDomain = tenantDomainFromHost(requestHost(h));
  if (hostDomain) {
    return getTenantByDomain(hostDomain);
  }

  return null;
});

/**
 * Tenant id for data queries on tenant hosts (slug.hospira.ro).
 * Falls back to default tenant when no host tenant (legacy / local dev).
 */
export async function getActiveTenantIdForData(): Promise<string> {
  const fromHost = await resolveRequestTenant();
  if (fromHost) return fromHost.id;

  const h = await headers();
  if (h.get("x-tenant-slug") || h.get("x-tenant-domain")) {
    const key = h.get("x-tenant-slug") ?? h.get("x-tenant-domain") ?? "?";
    throw new TenantNotFoundError(key);
  }

  const fallback = await getDefaultTenant();
  if (!fallback) throw new Error("No tenant configured");
  return fallback.id;
}

export async function getActiveTenantSlug(): Promise<string | null> {
  const t = await resolveRequestTenant();
  return t?.slug ?? null;
}
