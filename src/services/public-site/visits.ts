import { createPublicAdminClient } from "@/lib/supabase/admin-public";

/**
 * Store one anonymous page view. `client` (IP and browser) only feeds the
 * day's visitor hash inside the database and is never stored.
 */
export async function recordPublicSiteVisit(input: {
  tenantId: string;
  path: string;
  referrerHost: string | null;
  client: string;
}): Promise<void> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase.rpc("record_public_site_visit", {
    p_tenant_id: input.tenantId,
    p_path: input.path,
    p_referrer_host: input.referrerHost,
    p_client: input.client,
  });
  if (error) throw new Error(error.message);
}
