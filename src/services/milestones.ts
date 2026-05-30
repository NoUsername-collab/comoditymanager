import { getTenantScope } from "@/lib/tenant/scope";

export async function countConfirmedStays(): Promise<number> {
  const { tenantId, supabase } = await getTenantScope();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata");

  if (error) throw new Error(error.message);
  return count ?? 0;
}
