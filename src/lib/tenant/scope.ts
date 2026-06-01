import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffUser } from "@/lib/auth/require-staff";
import { getTenantMemberRole } from "@/services/tenant-members";
import { getActiveTenantIdForData, resolveRequestTenant } from "./active";

/** Resolved tenant + service-role client for admin data access. */
export type TenantScope = {
  tenantId: string;
  supabase: SupabaseClient;
};

/** On tenant hosts, staff must be an active member of that tenant. */
export async function assertStaffTenantAccess(tenantId: string): Promise<void> {
  const tenant = await resolveRequestTenant();
  if (!tenant) return;

  const user = await getStaffUser();
  if (!user) return;

  const role = await getTenantMemberRole(tenantId, user.id);
  if (!role) {
    throw new Error("auth.tenant_member_required");
  }
}

export async function getTenantScope(): Promise<TenantScope> {
  const tenantId = await getActiveTenantIdForData();
  await assertStaffTenantAccess(tenantId);
  const supabase = await createAdminClient();
  return { tenantId, supabase };
}

/** User-scoped client; RLS applies when JWT has app_metadata.tenant_id. */
export async function getTenantUserClient() {
  return createClient();
}

/** Run a block with tenant context — preferred entry for service functions. */
export async function withTenantScope<T>(
  fn: (ctx: TenantScope) => Promise<T>
): Promise<T> {
  return fn(await getTenantScope());
}

/** Attach tenant_id to insert payloads. */
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
