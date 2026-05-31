import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/** Shared cache invalidation after booking/calendar mutations. */
export function revalidateBookingSurfaces() {
  revalidateTag(CACHE_TAGS.bookingCounts, "max");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
}
