"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createBuilding } from "@/services/buildings";
import {
  defaultColorForAcMode,
  normalizeBuildingColor,
} from "@/lib/building-color-palette";
import type { AcMode } from "@/types/database";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { acModeToPolicyMode } from "@/lib/room-catalog-pricing";
import {
  listRoomOptions,
  setBuildingOptionPolicies,
} from "@/services/room-catalog";

export async function createBuildingAction(formData: FormData) {
  await requireLocationAdmin();
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

  try {
    const options = await listRoomOptions(true);
    const policies = options.map((opt) => {
      if (opt.slug === "ac") {
        return { option_id: opt.id, mode: acModeToPolicyMode(ac_mode) };
      }
      const raw = String(formData.get(`policy_${opt.id}`) ?? "per_room");
      const mode = (["all_rooms", "none", "per_room"].includes(raw)
        ? raw
        : "per_room") as AcMode;
      return { option_id: opt.id, mode };
    });
    await setBuildingOptionPolicies(building.id, policies);
  } catch {
    /* migrare 015 poate lipsi */
  }

  await logAdminActivityFromSession({
    action: "building.created",
    entityType: "building",
    entityId: building.id,
    summary: `Clădire nouă: ${name}`,
    metadata: { ac_mode, default_price_per_night },
  });
  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/");
  redirect("/admin/buildings");
}

export async function updateBuildingPoliciesAction(formData: FormData) {
  await requireLocationAdmin();
  const building_id = String(formData.get("building_id") ?? "");
  const ac_mode = String(formData.get("ac_mode") ?? "per_room") as AcMode;

  if (!building_id) throw new Error("ID clădire lipsă");

  const options = await listRoomOptions(true);
  const policies = options.map((opt) => {
    if (opt.slug === "ac") {
      return { option_id: opt.id, mode: acModeToPolicyMode(ac_mode) };
    }
    const raw = String(formData.get(`policy_${opt.id}`) ?? "per_room");
    const mode = (["all_rooms", "none", "per_room"].includes(raw)
      ? raw
      : "per_room") as OptionPolicyMode;
    return { option_id: opt.id, mode };
  });

  await setBuildingOptionPolicies(building_id, policies);

  await logAdminActivityFromSession({
    action: "building.price_updated",
    entityType: "building",
    entityId: building_id,
    summary: "Politici opțiuni clădire actualizate",
    metadata: { ac_mode },
  });

  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/rooms");
}

export async function createFloorAction(formData: FormData) {
  await requireLocationAdmin();
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
  await requireLocationAdmin();
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

  revalidateTag(CACHE_TAGS.buildings, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
  revalidatePath("/");
}

export async function deleteRoomFromBuildingAction(formData: FormData) {
  await requireLocationAdmin();
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

  revalidateTag(CACHE_TAGS.rooms, "max");
  revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
  revalidatePath("/admin/buildings");
  revalidatePath("/admin/rooms");
  revalidatePath("/");
}
