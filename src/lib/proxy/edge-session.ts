import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getEdgeSupabaseConfig } from "@/lib/env/edge";

export type ProxySupabase = ReturnType<typeof createServerClient>;

/**
 * Supabase session client for the proxy: reads cookies from `request` and writes
 * refreshed ones to both `request` and `response`. Null when Supabase is not configured.
 */
export function createProxySupabase(
  request: NextRequest,
  response: NextResponse
): ProxySupabase | null {
  const { configured, url, key } = getEdgeSupabaseConfig();
  if (!configured || !url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}
