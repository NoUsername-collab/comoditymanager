import { createClient } from "@supabase/supabase-js";

/** Client cu drepturi complete — DOAR pe server (Server Actions). */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Adaugă SUPABASE_SERVICE_ROLE_KEY în .env.local (Settings → API → service_role)"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
