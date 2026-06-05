import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffUser } from "@/lib/auth/require-staff";
import { getTenantMemberRole } from "@/services/tenant-members";
import { resolveRequestTenant } from "./active";
import { requireTenantIdForData } from "./guards";

/** Resolved tenant + service-role client for admin data access. */
export type TenantScope = {
  tenantId: string;
  supabase: SupabaseClient;
};

/**
 * Request-scoped flag: when true, getTenantScope() skips staff auth.
 * Uses AsyncLocalStorage so concurrent requests are isolated — one
 * request's public booking mode cannot leak into another request.
 *
 * Security: tenant ID still comes from host (cannot be spoofed).
 * Auth for admin actions is enforced at the action level (requireAdmin).
 */
import { AsyncLocalStorage } from "node:async_hooks";

const publicBookingStorage = new AsyncLocalStorage<boolean>();

/**
 * Run a function in public booking mode — all getTenantScope() calls
 * within this async context skip staff auth. Request-isolated.
 */
export function runInPublicBookingMode<T>(fn: () => Promise<T>): Promise<T> {
  return publicBookingStorage.run(true, fn);
}

function isPublicBookingMode(): boolean {
  return publicBookingStorage.getStore() === true;
}

/**
 * Staff on tenant host must be an active member; tenant id must match host.
 * No silent pass — prevents service-role access without membership.
 *
 * Cached per request via React cache() — multiple calls in the same
 * server action / server component render share the result.
 */
const cachedAssertStaff = cache(async (tenantId: string): Promise<void> => {
  const tenant = await resolveRequestTenant();
  if (!tenant) {
    throw new Error("auth.tenant_host_required");
  }

  const user = await getStaffUser();
  if (!user) {
    throw new Error("auth.login_required");
  }

  if (tenant.id !== tenantId) {
    throw new Error("auth.tenant_scope_mismatch");
  }

  const role = await getTenantMemberRole(tenant.id, user.id);
  if (!role) {
    throw new Error("auth.tenant_member_required");
  }
});

export async function assertStaffTenantAccess(tenantId: string): Promise<void> {
  return cachedAssertStaff(tenantId);
}

/**
 * Cached admin Supabase client — created once per request.
 * Prevents creating 5-10 identical clients in a single action chain.
 */
const cachedAdminClient = cache(async (): Promise<SupabaseClient> => {
  return createAdminClient();
});

type TenantScopeOptions = {
  /** When false, public reads on tenant host only (calendar). Default true for admin. */
  requireStaff?: boolean;
};

/**
 * Get tenant scope (tenant ID + admin Supabase client).
 *
 * Performance: tenantId, staff assertion, and admin client are all
 * cached per-request via React cache(). Calling getTenantScope() 10x
 * in one action chain = 1 set of DB queries, not 10.
 */
export async function getTenantScope(
  options: TenantScopeOptions = {}
): Promise<TenantScope> {
  const { requireStaff = true } = options;
  const tenantId = await requireTenantIdForData();
  if (requireStaff && !isPublicBookingMode()) {
    await assertStaffTenantAccess(tenantId);
  }
  const supabase = await cachedAdminClient();
  return { tenantId, supabase };
}

/** Public booking / availability — tenant from host only, no staff login. */
export async function getTenantPublicScope(): Promise<TenantScope> {
  return getTenantScope({ requireStaff: false });
}

/** @deprecated Use getTenantPublicScope */
export async function getTenantDataScope(): Promise<TenantScope> {
  return getTenantPublicScope();
}

export async function getTenantUserClient() {
  return createClient();
}

export async function withTenantScope<T>(
  fn: (ctx: TenantScope) => Promise<T>
): Promise<T> {
  return fn(await getTenantScope());
}

export function withTenantId<T extends Record<string, unknown>>(
  tenantId: string,
  row: T
): T & { tenant_id: string } {
  return { ...row, tenant_id: tenantId };
}

export function tenantCacheKey(tenantId: string, ...parts: string[]): string[] {
  return [tenantId, ...parts];
}

export function tenantCacheTag(tenantId: string, suffix: string): string {
  return `tenant-${tenantId}-${suffix}`;
}
