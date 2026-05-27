"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { updateBuildingDefaultPrice } from "@/services/buildings";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function updateBuildingDefaultPriceAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  const building_id = String(formData.get("building_id") ?? "");
  const price = Number(formData.get("default_price_per_night") ?? 0);
  if (!building_id) throw new Error(t("idMissing"));
  await updateBuildingDefaultPrice(building_id, price);
  await logAdminActivityFromSession({
    action: "building.price_updated",
    entityType: "building",
    entityId: building_id,
    summary: t("buildingDefaultPriceSummary", { price }),
    metadata: { default_price_per_night: price },
  });
  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
}
