import { createPublicAdminClient } from "@/lib/supabase/admin";
import { buildPublicStayOffers } from "@/features/public-site/domain/stay-offers";
import type { PublicStayOffer, PublicStayPhoto } from "@/features/public-site/domain/types";
import { mediaFocus, type MediaAsset } from "@/domain/media/types";
import { roomTypePhotosForTenant } from "@/services/media-library";

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
    // Without the photo library the rooms still list, only without photos.
    const library = await roomTypePhotosForTenant(tenantId).catch(
      () => new Map<string, MediaAsset[]>(),
    );
    const photos = new Map<string, PublicStayPhoto[]>(
      [...library].map(([typeId, assets]) => [
        typeId,
        assets.map((asset) => ({ url: asset.url, alt: asset.alt, focus: mediaFocus(asset) })),
      ]),
    );
    return buildPublicStayOffers(typesResult.data ?? [], roomsResult.data ?? [], photos);
  } catch {
    return [];
  }
}
