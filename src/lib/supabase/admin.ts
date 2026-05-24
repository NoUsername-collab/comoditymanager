import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/env/server";

/** Client cu drepturi complete — DOAR pe server (Server Actions). */
export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
