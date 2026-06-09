import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";

async function countConfirmedStaysImpl(tenantId: string): Promise<number> {
  const supabase = createPublicAdminClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const getCachedConfirmedStaysCount = (tenantId: string) =>
  unstable_cache(
    () => countConfirmedStaysImpl(tenantId),
    ["confirmed-stays-count", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 60,
    }
  );

const loadConfirmedStaysCount = cache((tenantId: string) =>
  getCachedConfirmedStaysCount(tenantId)()
);

export async function countConfirmedStays(): Promise<number> {
  const { tenantId } = await getTenantScope();
  return loadConfirmedStaysCount(tenantId);
}
