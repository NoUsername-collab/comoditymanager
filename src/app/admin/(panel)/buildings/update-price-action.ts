"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { updateBuildingDefaultPrice } from "@/services/buildings";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function updateBuildingDefaultPriceAction(formData: FormData) {
  const building_id = String(formData.get("building_id") ?? "");
  const price = Number(formData.get("default_price_per_night") ?? 0);
  if (!building_id) throw new Error("ID lipsă");
  await updateBuildingDefaultPrice(building_id, price);
  await logAdminActivityFromSession({
    action: "building.price_updated",
    entityType: "building",
    entityId: building_id,
    summary: `Preț implicit clădire: ${price} RON/noapte`,
    metadata: { default_price_per_night: price },
  });
  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
}
