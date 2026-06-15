"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getBuildingDefaultPrice,
  updateBuildingDefaultPrice,
} from "@/services/buildings";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";

export async function updateBuildingDefaultPriceAction(formData: FormData) {
  const [t] = await Promise.all([
    getTranslations("admin.serverActions"),
    requireLocationAdmin(),
  ]);
  const building_id = String(formData.get("building_id") ?? "");
  const price = Number(formData.get("default_price_per_night") ?? 0);
  if (!building_id) throw new Error(t("idMissing"));

  const previousPrice = await getBuildingDefaultPrice(building_id).catch(() => 0);
  await updateBuildingDefaultPrice(building_id, price);
  await logAdminActivityFromSession({
    action: "building.price_updated",
    entityType: "building",
    entityId: building_id,
    summary: t("buildingDefaultPriceSummary", { price }),
    undoable: true,
    metadata: {
      default_price_per_night: price,
      previous_price_per_night: previousPrice,
    },
  });
  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
}
