import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";

/**
 * Invalidate building/room structure caches.
 * @param tenantId — when provided, only busts this tenant's structure cache
 */
export function revalidateStructurePaths(tenantId?: string) {
  if (tenantId) {
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.buildings), "max");
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.rooms), "max");
  } else {
    revalidateTag(CACHE_TAGS.buildings, "max");
    revalidateTag(CACHE_TAGS.rooms, "max");
  }
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
  revalidatePath("/admin/settings/location/structure");
  revalidatePath("/admin/calendar");
}
