import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env/server";
import { isSimActive } from "@/domain/simulation/sim-cookie";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicConfig();
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
}
