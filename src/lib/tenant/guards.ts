import {
  getTenantContext,
  TenantContextMissingError,
} from "@/core/tenant/context";
import { resolveRequestTenant, TenantNotFoundError } from "@/lib/tenant/active";

export class TenantHostRequiredError extends Error {
  constructor() {
    super("auth.tenant_host_required");
    this.name = "TenantHostRequiredError";
  }
}

export function isDevTenantBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Single source of truth for which tenant's data we read/write.
 * Production: MUST resolve from host / proxy headers — never "first tenant in DB".
 */
export async function requireTenantIdForData(): Promise<string> {
  const fromHost = await resolveRequestTenant();
  if (fromHost) return fromHost.id;

  if (isDevTenantBypass()) {
    try {
      return getTenantContext().tenant.id;
    } catch (e) {
      if (e instanceof TenantContextMissingError) {
        throw new TenantHostRequiredError();
      }
      throw e;
    }
  }

  throw new TenantHostRequiredError();
}

export { TenantNotFoundError };
