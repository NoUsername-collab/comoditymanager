import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantIdForData } from "./active";

/** Resolved tenant + service-role client for admin data access. */
export type TenantScope = {
  tenantId: string;
  supabase: SupabaseClient;
};

export async function getTenantScope(): Promise<TenantScope> {
  const tenantId = await getActiveTenantIdForData();
  const supabase = await createAdminClient();
  return { tenantId, supabase };
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
