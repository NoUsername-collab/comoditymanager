import { cache } from "react";
import { headers } from "next/headers";
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

/** Tenant from subdomain/custom domain headers (set in proxy.ts). */
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
