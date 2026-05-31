"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { listBuildings } from "@/services/buildings";
import { parseSelectedOptionIds } from "@/services/room-catalog";
import { createRoom, createRoomsBulk } from "@/services/rooms-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { revalidateStructurePaths } from "@/lib/cache/revalidate-structure";
import { getTranslations } from "next-intl/server";

function roomReturnPath(formData: FormData): string {
  const raw = String(formData.get("return_to") ?? "").trim();
  if (raw === "structure") return "/admin/settings/location/structure";
  return "";
}

export async function createRoomAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const create_mode = String(formData.get("create_mode") ?? "single");
  const building_id = String(formData.get("building_id") ?? "");
  const floor_id = String(formData.get("floor_id") ?? "");
  const room_type_definition_id = String(
    formData.get("room_type_definition_id") ?? ""
  );
  const price_per_night = Number(formData.get("price_per_night") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const allows_extra_beds = formData.get("allows_extra_beds") === "on";
  const max_extra_beds_per_room = Number(
    formData.get("max_extra_beds_per_room") ?? 0
  );
  const enabled_option_ids = parseSelectedOptionIds(formData).filter(Boolean);

  if (!building_id || !room_type_definition_id) {
    throw new Error(t("buildingAndRoomTypeRequired"));
  }

  const buildings = await listBuildings();
  const b = buildings.find((x) => x.id === building_id);
  const building_default_price = b?.default_price_per_night ?? 0;

  if (create_mode === "bulk") {
    const name_prefix = String(formData.get("name_prefix") ?? t("roomPrefixDefault"));
    const start_number = Number(formData.get("start_number") ?? 1);
    const bulk_count = Number(formData.get("bulk_count") ?? 1);

    const { ids } = await createRoomsBulk({
      building_id,
      floor_id: floor_id || null,
      room_type_definition_id,
      count: bulk_count,
      name_prefix,
      start_number,
      allows_extra_beds,
      max_extra_beds_per_room,
      enabled_option_ids,
      price_per_night,
      sort_order_start: sort_order,
      building_default_price,
    });

    await logAdminActivityFromSession({
      action: "room.created",
      entityType: "room",
      summary: t("bulkRoomsSummary", {
        count: ids.length,
        prefix: name_prefix,
        start: start_number,
      }),
      metadata: { building_id, bulk_count, room_type_definition_id },
    });

    revalidateStructurePaths();
    revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
    revalidatePath("/");
    const back = roomReturnPath(formData);
    await redirect(back || `/admin/rooms?bulk=${ids.length}`);
  }

  const name = String(formData.get("name") ?? "");
  if (!name) throw new Error(t("roomNameRequired"));

  const room = await createRoom({
    building_id,
    floor_id: floor_id || null,
    name,
    room_type_definition_id,
    capacity_base: 2,
    allows_extra_beds,
    max_extra_beds_per_room,
    enabled_option_ids,
    price_per_night,
    sort_order,
    building_default_price,
  });

  await logAdminActivityFromSession({
    action: "room.created",
    entityType: "room",
    entityId: room.id,
    summary: t("newRoomSummary", { name }),
    metadata: { building_id, room_type_definition_id },
  });

  revalidateStructurePaths();
  revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
  revalidatePath("/");
  const back = roomReturnPath(formData);
  await redirect(back || "/admin/rooms");
}
