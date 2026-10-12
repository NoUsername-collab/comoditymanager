

export function getEdgeSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return {
    configured: Boolean(url && key && url.includes("supabase")),
    url,
    key,
  };
}
