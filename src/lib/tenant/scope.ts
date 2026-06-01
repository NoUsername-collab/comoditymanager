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
 * Staff on tenant host must be an active member; tenant id must match host.
 * No silent pass — prevents service-role access without membership.
 */
export async function assertStaffTenantAccess(tenantId: string): Promise<void> {
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
}

type TenantScopeOptions = {
  /** When false, public reads on tenant host only (calendar). Default true for admin. */
  requireStaff?: boolean;
};

export async function getTenantScope(
  options: TenantScopeOptions = {}
): Promise<TenantScope> {
  const { requireStaff = true } = options;
  const tenantId = await requireTenantIdForData();
  if (requireStaff) {
    await assertStaffTenantAccess(tenantId);
  }
  const supabase = await createAdminClient();
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
