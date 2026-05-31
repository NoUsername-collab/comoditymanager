import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

export function revalidateStructurePaths() {
  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidateTag(CACHE_TAGS.rooms, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
  revalidatePath("/admin/settings/location/structure");
  revalidatePath("/admin/calendar");
}
