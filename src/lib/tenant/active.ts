import { cache } from "react";
import { headers } from "next/headers";
import {
  tenantDomainFromHost,
  tenantSlugFromHost,
} from "@/lib/tenant/host";
import {
  getTenantByDomain,
  getTenantBySlug,
  type TenantRow,
} from "@/services/tenants";
import { requireTenantIdForData } from "@/lib/tenant/guards";

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

  if (process.env.NODE_ENV === "development") {
    const devSlug = process.env.DEV_TENANT_SLUG?.trim();
    if (devSlug) {
      return getTenantBySlug(devSlug);
    }
  }

  return null;
});

/** @deprecated Use requireTenantIdForData() */
export async function getActiveTenantIdForData(): Promise<string> {
  const h = await headers();
  if (h.get("x-tenant-slug") || h.get("x-tenant-domain")) {
    const key = h.get("x-tenant-slug") ?? h.get("x-tenant-domain") ?? "?";
    throw new TenantNotFoundError(key);
  }
  return requireTenantIdForData();
}

export async function getActiveTenantSlug(): Promise<string | null> {
  const t = await resolveRequestTenant();
  return t?.slug ?? null;
}
