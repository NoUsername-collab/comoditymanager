"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateRoom } from "@/services/rooms-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function updateRoomAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const building_id = String(formData.get("building_id") ?? "");
  const floor_id = String(formData.get("floor_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const capacity_base = Number(formData.get("capacity_base") ?? 2);
  const price_per_night = Number(formData.get("price_per_night") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const allows_extra_beds = formData.get("allows_extra_beds") === "on";
  const max_extra_beds_per_room = Number(formData.get("max_extra_beds_per_room") ?? 0);
  const has_ac = formData.get("has_ac") === "on";
  const is_active = formData.get("is_active") === "on";

  if (!id || !building_id || !name) {
    throw new Error("Date incomplete");
  }

  await updateRoom(id, {
    building_id,
    floor_id: floor_id || null,
    name,
    capacity_base,
    allows_extra_beds,
    max_extra_beds_per_room,
    has_ac,
    price_per_night,
    sort_order,
    is_active,
  });

  await logAdminActivityFromSession({
    action: "room.updated",
    entityType: "room",
    entityId: id,
    summary: `Cameră actualizată: ${name}`,
    metadata: { is_active, price_per_night },
  });

  revalidatePath("/admin/rooms");
  revalidatePath("/");
  revalidatePath("/admin/calendar");
  redirect("/admin/rooms");
}
