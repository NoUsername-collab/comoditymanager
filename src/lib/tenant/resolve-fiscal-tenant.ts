import { cache } from "react";
import {
  buildTenantContext,
  DEV_FALLBACK_TENANT,
} from "@/core/tenant/context";
import type { TenantCountry } from "@/domain/fiscal/country-fiscal-profile";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { tenantRowToRecord } from "@/lib/tenant/record";

function countryFromSlug(country: string | null | undefined): TenantCountry {
  if (country === "BG" || country === "MD") return country;
  return "RO";
}

/**
 * Country for fiscal / invoice — resolved from host tenant, not module singleton.
 */
export const resolveTenantCountryForRequest = cache(
  async (): Promise<TenantCountry> => {
    const row = await resolveRequestTenant();
    if (row) return countryFromSlug(row.country);
    if (process.env.NODE_ENV === "development") {
      return DEV_FALLBACK_TENANT.country;
    }
    return "RO";
  },
);

export const resolveShowBrandingForRequest = cache(async (): Promise<boolean> => {
  const row = await resolveRequestTenant();
  if (row) {
    return buildTenantContext(tenantRowToRecord(row)).showBranding;
  }
  return buildTenantContext(DEV_FALLBACK_TENANT).showBranding;
});
