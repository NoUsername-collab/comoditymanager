"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBuilding } from "@/services/buildings";
import {
  defaultColorForAcMode,
  normalizeBuildingColor,
} from "@/lib/building-color-palette";
import type { AcMode } from "@/types/database";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function createBuildingAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const ac_mode = String(formData.get("ac_mode") ?? "per_room") as AcMode;
  const color_hex =
    normalizeBuildingColor(String(formData.get("color_hex") ?? "")) ??
    defaultColorForAcMode(ac_mode);

  if (!name) {
    throw new Error("Numele clădirii e obligatoriu");
  }

  const default_price_per_night = Number(
    formData.get("default_price_per_night") ?? 0
  );
  const building = await createBuilding({
    name,
    sort_order,
    color_hex,
    ac_mode,
    default_price_per_night,
  });
  await logAdminActivityFromSession({
    action: "building.created",
    entityType: "building",
    entityId: building.id,
    summary: `Clădire nouă: ${name}`,
    metadata: { ac_mode, default_price_per_night },
  });
  revalidatePath("/admin/buildings");
  revalidatePath("/");
  redirect("/admin/buildings");
}

export async function createFloorAction(formData: FormData) {
  const { createFloor } = await import("@/services/floors");

  const building_id = String(formData.get("building_id") ?? "");
  const name = String(formData.get("name") ?? "");
  const level_number = formData.get("level_number")
    ? Number(formData.get("level_number"))
    : null;
  const sort_order = Number(formData.get("sort_order") ?? 0);

  if (!building_id || !name) {
    throw new Error("Clădirea și numele etajului sunt obligatorii");
  }

  const floor = await createFloor({ building_id, name, level_number, sort_order });
  await logAdminActivityFromSession({
    action: "floor.created",
    entityType: "floor",
    entityId: floor.id,
    summary: `Etaj: ${name}`,
    metadata: { building_id },
  });
  revalidatePath("/admin/buildings");
  redirect("/admin/buildings");
}

export async function deleteBuildingAction(formData: FormData) {
  const { deleteBuilding } = await import("@/services/buildings");
  const building_id = String(formData.get("building_id") ?? "");
  if (!building_id) throw new Error("ID lipsă");

  try {
    await deleteBuilding(building_id);
    await logAdminActivityFromSession({
      action: "building.deleted",
      entityType: "building",
      entityId: building_id,
      summary: `Clădire ștearsă`,
      metadata: { building_id },
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error("Eroare la ștergere");
  }

  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
  revalidatePath("/");
}

export async function deleteRoomFromBuildingAction(formData: FormData) {
  const { deleteRoom } = await import("@/services/rooms-admin");
  const room_id = String(formData.get("room_id") ?? "");
  if (!room_id) throw new Error("ID lipsă");

  try {
    await deleteRoom(room_id);
    await logAdminActivityFromSession({
      action: "room.deleted",
      entityType: "room",
      entityId: room_id,
      summary: `Cameră ștearsă`,
      metadata: { room_id },
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error("Eroare la ștergere");
  }

  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
  revalidatePath("/");
}
