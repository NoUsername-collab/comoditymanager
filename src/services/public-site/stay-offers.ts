import { createPublicAdminClient } from "@/lib/supabase/admin";
import { buildPublicStayOffers } from "@/features/public-site/domain/stay-offers";
import type { PublicStayOffer } from "@/features/public-site/domain/types";

export async function loadPublicStayOffers(tenantId: string): Promise<PublicStayOffer[]> {
  try {
    const supabase = createPublicAdminClient();
    const [typesResult, roomsResult] = await Promise.all([
      supabase
        .from("room_type_definitions")
        .select("id, name, capacity_base, base_price_per_night, sort_order, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("rooms")
        .select("room_type_definition_id, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
    ]);
    if (typesResult.error || roomsResult.error) return [];
    return buildPublicStayOffers(typesResult.data ?? [], roomsResult.data ?? []);
  } catch {
    return [];
  }
}
