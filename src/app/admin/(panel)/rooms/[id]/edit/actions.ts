"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { listBuildings } from "@/services/buildings";
import { parseSelectedOptionIds } from "@/services/room-catalog";
import { updateRoom } from "@/services/rooms-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function updateRoomAction(formData: FormData) {
  await requireLocationAdmin();

  const id = String(formData.get("id") ?? "");
  const building_id = String(formData.get("building_id") ?? "");
  const floor_id = String(formData.get("floor_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const room_type_definition_id = String(
    formData.get("room_type_definition_id") ?? ""
  );
  const capacity_base = Number(formData.get("capacity_base") ?? 2);
  const price_per_night = Number(formData.get("price_per_night") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const allows_extra_beds = formData.get("allows_extra_beds") === "on";
  const max_extra_beds_per_room = Number(
    formData.get("max_extra_beds_per_room") ?? 0
  );
  const is_active = formData.get("is_active") === "on";
  const enabled_option_ids = parseSelectedOptionIds(formData).filter(Boolean);

  if (!id || !building_id || !name) {
    throw new Error("Date incomplete");
  }

  const buildings = await listBuildings();
  const b = buildings.find((x) => x.id === building_id);

  await updateRoom(id, {
    building_id,
    floor_id: floor_id || null,
    name,
    room_type_definition_id: room_type_definition_id || null,
    capacity_base,
    allows_extra_beds,
    max_extra_beds_per_room,
    enabled_option_ids,
    price_per_night,
    sort_order,
    is_active,
    building_default_price: b?.default_price_per_night ?? 0,
  });

  await logAdminActivityFromSession({
    action: "room.updated",
    entityType: "room",
    entityId: id,
    summary: `Cameră actualizată: ${name}`,
    metadata: { is_active, room_type_definition_id },
  });

  revalidateTag(CACHE_TAGS.rooms);
  revalidateTag(CACHE_TAGS.roomOptionsByRoom);
  revalidatePath("/admin/rooms");
  revalidatePath("/");
  revalidatePath("/admin/calendar");
  redirect("/admin/rooms");
}
