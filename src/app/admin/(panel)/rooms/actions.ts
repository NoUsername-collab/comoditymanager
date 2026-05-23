"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listBuildings } from "@/services/buildings";
import { createRoom } from "@/services/rooms-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function createRoomAction(formData: FormData) {
  const building_id = String(formData.get("building_id") ?? "");
  const floor_id = String(formData.get("floor_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const capacity_base = Number(formData.get("capacity_base") ?? 2);
  let price_per_night = Number(formData.get("price_per_night") ?? 0);
  if (price_per_night <= 0 && building_id) {
    const buildings = await listBuildings();
    const b = buildings.find((x) => x.id === building_id);
    price_per_night = b?.default_price_per_night ?? 0;
  }
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const allows_extra_beds = formData.get("allows_extra_beds") === "on";
  const max_extra_beds_per_room = Number(
    formData.get("max_extra_beds_per_room") ?? 0
  );
  const has_ac = formData.get("has_ac") === "on";

  if (!building_id || !name) {
    throw new Error("Clădirea și numele camerei sunt obligatorii");
  }

  const room = await createRoom({
    building_id,
    floor_id: floor_id || null,
    name,
    capacity_base,
    allows_extra_beds,
    max_extra_beds_per_room,
    has_ac,
    price_per_night,
    sort_order,
  });

  await logAdminActivityFromSession({
    action: "room.created",
    entityType: "room",
    entityId: room.id,
    summary: `Cameră nouă: ${name}`,
    metadata: { building_id, price_per_night },
  });

  revalidatePath("/admin/rooms");
  revalidatePath("/");
  redirect("/admin/rooms");
}
