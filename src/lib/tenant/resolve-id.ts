import { cache } from "react";
import { requireTenantIdForData } from "@/lib/tenant/guards";

/**
 * Tenant id for data reads (public calendar + admin).
 * Always aligned with host tenant in production.
 */
export const resolveTenantIdForData = cache(async (): Promise<string> =>
  requireTenantIdForData()
);

/** Alias — same per-request dedupe as resolveTenantIdForData. */
export const resolveTenantId = resolveTenantIdForData;
