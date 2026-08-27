"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveRequestTenant } from "@/lib/tenant/active";

export type BindTenantSessionResult =
  | { ok: true; tenantId: string; refreshed: boolean }
  | { ok: false; reason: "no_tenant" | "no_user" | "error"; message?: string };

/**
 * Aligns auth.users app_metadata.tenant_id with the current host tenant (RLS).
 * Client should call refreshSession() when refreshed is true.
 */
export async function bindTenantSessionAction(): Promise<BindTenantSessionResult> {
  const tenant = await resolveRequestTenant();
  if (!tenant) {
    return { ok: false, reason: "no_tenant" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "no_user" };
  }

  const current =
    (user.app_metadata?.tenant_id as string | undefined) ??
    (user.user_metadata?.tenant_id as string | undefined);

  if (current === tenant.id) {
    return { ok: true, tenantId: tenant.id, refreshed: false };
  }

  const { error } = await supabase.rpc("bind_auth_tenant_for_host", {
    p_tenant_id: tenant.id,
  });

  if (error) {
    return { ok: false, reason: "error", message: error.message };
  }

  return { ok: true, tenantId: tenant.id, refreshed: true };
}
