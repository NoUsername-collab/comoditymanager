import { createPublicAdminClient } from "@/lib/supabase/admin";
import { requireTenantIdForData } from "@/lib/tenant/guards";

/**
 * Guest app data always lives in public schema.
 * Codes/settings must match what /stay reads.
 */
export async function getGuestAppPublicDb() {
  const tenantId = await requireTenantIdForData();
  return { tenantId, supabase: createPublicAdminClient() };
}
