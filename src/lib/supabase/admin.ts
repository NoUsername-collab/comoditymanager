import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/env/server";

/**
 * Admin client that is simulation-aware.
 *
 * When simulation is active (cookie set), returns a client targeting
 * the 'sim_sandbox' schema so all .from() queries hit the sandbox.
 * When inactive, targets the default 'public' schema.
 *
 * NOTE: This is async because it reads the sim cookie.
 */
export async function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const key = getSupabaseServiceRoleKey();
  const { isSimActive } = await import("@/domain/simulation/sim-cookie");
  const simActive = await isSimActive();

  if (simActive) {
    // Verify sim_sandbox schema actually exists before using it
    const publicClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let simSchemaReady = false;
    try {
      const { data } = await publicClient.rpc("sim_is_active");
      simSchemaReady = Boolean(data);
    } catch {
      simSchemaReady = false;
    }
    if (simSchemaReady) {
      return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        db: { schema: "sim_sandbox" as "public" },
      });
    }
    // Cookie says active but schema gone — clear cookie, fall through to public
    const { clearSimCookie } = await import("@/domain/simulation/sim-cookie");
    await clearSimCookie().catch(() => {});
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { createPublicAdminClient } from "@/lib/supabase/admin-public";
