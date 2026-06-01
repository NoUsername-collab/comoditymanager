import { createPublicAdminClient } from "@/lib/supabase/admin";
import { isFactoryResetEnabled as envFactoryResetEnabled } from "@/lib/env/server";
import { getTenantScope } from "@/lib/tenant/scope";

export function isFactoryResetEnabled(): boolean {
  return envFactoryResetEnabled();
}

export function assertFactoryResetAllowed(): void {
  if (!isFactoryResetEnabled()) {
    throw new Error(
      "factory_reset.disabled_set_admin_factory_reset_enabled_true"
    );
  }
}

/** Șterge datele operaționale doar pentru pensiunea curentă. */
export async function runFactoryReset(): Promise<void> {
  assertFactoryResetAllowed();

  const { tenantId } = await getTenantScope();
  const supabase = createPublicAdminClient();
  const { error } = await supabase.rpc("admin_factory_reset_for_tenant", {
    p_tenant_id: tenantId,
  });

  if (error) {
    if (
      error.message.includes("admin_factory_reset_for_tenant") &&
      error.message.includes("does not exist")
    ) {
      throw new Error(
        "factory_reset.rpc_admin_factory_reset_for_tenant_missing_run_migration_042"
      );
    }
    throw new Error(error.message);
  }
}
