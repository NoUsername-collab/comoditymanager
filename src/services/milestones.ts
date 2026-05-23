import { createAdminClient } from "@/lib/supabase/admin";

export async function countConfirmedStays(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmata");

  if (error) throw new Error(error.message);
  return count ?? 0;
}
