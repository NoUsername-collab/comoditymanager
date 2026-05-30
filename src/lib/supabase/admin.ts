import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/env/server";
import { isSimActive } from "@/domain/simulation/sim-cookie";

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
  const simActive = await isSimActive();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(simActive
      ? { db: { schema: "sim_sandbox" as "public" } }
      : {}),
  });
}

/**
 * Admin client that ALWAYS targets 'public' schema.
 *
 * Use this for:
 * - Calling RPC functions (they live in public)
 * - Simulation lifecycle operations (start/stop)
 * - Operations that must never touch sim_sandbox
 */
export function createPublicAdminClient() {
  const { url } = getSupabasePublicConfig();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
