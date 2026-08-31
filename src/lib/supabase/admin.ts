import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/env/server";

export async function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const key = getSupabaseServiceRoleKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { createPublicAdminClient } from "@/lib/supabase/admin-public";
