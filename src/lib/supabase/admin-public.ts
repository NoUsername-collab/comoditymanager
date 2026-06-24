import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/env/server";

/**
 * Admin client that ALWAYS targets the public schema.
 * Safe to import from Edge middleware/instrumentation (no sim cookie).
 */
export function createPublicAdminClient() {
  const { url } = getSupabasePublicConfig();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}