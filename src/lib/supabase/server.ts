import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env/server";

/**
 * Cached per-request Supabase server client.
 * Before: every call to createClient() created a new client + read cookies.
 * Now: one client per request, reused across all server components/actions.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicConfig();
  const { isSimActive } = await import("@/domain/simulation/sim-cookie");
  const simActive = await isSimActive();

  return createServerClient(url, anonKey, {
    ...(simActive
      ? { db: { schema: "sim_sandbox" as "public" } }
      : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — ignorat dacă middleware setează cookie-uri
        }
      },
    },
  });
});
