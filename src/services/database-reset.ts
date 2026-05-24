import { createAdminClient } from "@/lib/supabase/admin";

export function isFactoryResetEnabled(): boolean {
  return process.env.ADMIN_FACTORY_RESET_ENABLED === "true";
}

export function assertFactoryResetAllowed(): void {
  if (!isFactoryResetEnabled()) {
    throw new Error(
      "Reset factory dezactivat. Setează ADMIN_FACTORY_RESET_ENABLED=true în env (recomandat doar staging/dev)."
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
        "Funcția admin_factory_reset lipsește. Rulează migrarea 013_factory_reset.sql în Supabase."
      );
    }
    throw new Error(error.message);
  }
}
