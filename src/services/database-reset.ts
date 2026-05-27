import { createAdminClient } from "@/lib/supabase/admin";

import { isFactoryResetEnabled as envFactoryResetEnabled } from "@/lib/env/server";

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

/** Șterge toate datele operaționale; păstrează schema și conturile admin Auth. */
export async function runFactoryReset(): Promise<void> {
  assertFactoryResetAllowed();

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("admin_factory_reset");

  if (error) {
    if (
      error.message.includes("admin_factory_reset") &&
      error.message.includes("does not exist")
    ) {
      throw new Error(
        "factory_reset.rpc_admin_factory_reset_missing_run_migration_013"
      );
    }
    throw new Error(error.message);
  }
}
