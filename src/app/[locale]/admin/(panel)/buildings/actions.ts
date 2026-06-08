"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { revalidateStructurePaths } from "@/lib/cache/revalidate-structure";
import { createBuilding, updateBuilding } from "@/services/buildings";
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
import { getTranslations } from "next-intl/server";

export async function createBuildingAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();
  const name = String(formData.get("name") ?? "");
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const ac_mode = String(formData.get("ac_mode") ?? "per_room") as AcMode;
  const color_hex =
    normalizeBuildingColor(String(formData.get("color_hex") ?? "")) ??
    defaultColorForAcMode(ac_mode);

  if (!name) {
    throw new Error(t("buildingNameRequired"));
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
    summary: t("buildingCreatedSummary", { name }),
    metadata: { ac_mode, default_price_per_night },
  });
  revalidateStructurePaths();
  const back = structureReturnPath(formData);
  await redirect(back || "/admin/buildings");
}

export async function updateBuildingPoliciesAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();
  const building_id = String(formData.get("building_id") ?? "");
  const ac_mode = String(formData.get("ac_mode") ?? "per_room") as AcMode;

  if (!building_id) throw new Error(t("buildingIdMissing"));

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
    summary: t("buildingPoliciesUpdated"),
    metadata: { ac_mode },
  });

  revalidateStructurePaths();
}

export type FloorFormState = {
  ok: boolean;
  messageKey?:
    | "floorCreated"
    | "floorUpdated"
    | "floorDeleted"
    | "floorDuplicate";
  message?: string;
} | null;

export type BuildingFormState = {
  ok: boolean;
  messageKey?: "buildingUpdated";
  message?: string;
} | null;

function structureReturnPath(formData: FormData): string {
  const raw = String(formData.get("return_to") ?? "").trim();
  if (raw === "structure") return "/admin/settings/location/structure";
  return "";
}

export async function createFloorFormAction(
  _prev: FloorFormState,
  formData: FormData
): Promise<FloorFormState> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireLocationAdmin();
    const { createFloor } = await import("@/services/floors");

    const building_id = String(formData.get("building_id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const level_number = formData.get("level_number")
      ? Number(formData.get("level_number"))
      : null;
    const sort_order = Number(formData.get("sort_order") ?? 0);

    if (!building_id || !name) {
      return { ok: false, message: t("buildingAndFloorNameRequired") };
    }

    const floor = await createFloor({
      building_id,
      name,
      level_number,
      sort_order,
    });
    await logAdminActivityFromSession({
      action: "floor.created",
      entityType: "floor",
      entityId: floor.id,
      summary: t("floorSummary", { name }),
      metadata: { building_id },
    });
    revalidateStructurePaths();
    return { ok: true, messageKey: "floorCreated" };
  } catch (e) {
    if (e instanceof Error && e.message === "floors.duplicate_name") {
      return { ok: false, messageKey: "floorDuplicate" };
    }
    return {
      ok: false,
      message: e instanceof Error ? e.message : t("deleteError"),
    };
  }
}

export async function updateFloorFormAction(
  _prev: FloorFormState,
  formData: FormData
): Promise<FloorFormState> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireLocationAdmin();
    const { updateFloor } = await import("@/services/floors");

    const floor_id = String(formData.get("floor_id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const level_number = formData.get("level_number")
      ? Number(formData.get("level_number"))
      : null;
    const sort_order = Number(formData.get("sort_order") ?? 0);

    if (!floor_id || !name) {
      return { ok: false, message: t("buildingAndFloorNameRequired") };
    }

    await updateFloor({ floor_id, name, level_number, sort_order });
    await logAdminActivityFromSession({
      action: "floor.updated",
      entityType: "floor",
      entityId: floor_id,
      summary: t("floorUpdatedSummary", { name }),
    });
    revalidateStructurePaths();
    return { ok: true, messageKey: "floorUpdated" };
  } catch (e) {
    if (e instanceof Error && e.message === "floors.duplicate_name") {
      return { ok: false, messageKey: "floorDuplicate" };
    }
    return {
      ok: false,
      message: e instanceof Error ? e.message : t("deleteError"),
    };
  }
}

export async function deleteFloorAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();
  const { deleteFloor } = await import("@/services/floors");
  const floor_id = String(formData.get("floor_id") ?? "");
  if (!floor_id) throw new Error(t("idMissing"));

  const { roomsUnassigned } = await deleteFloor(floor_id);
  await logAdminActivityFromSession({
    action: "floor.deleted",
    entityType: "floor",
    entityId: floor_id,
    summary: t("floorDeletedSummary"),
    metadata: { roomsUnassigned },
  });
  revalidateStructurePaths();
}

export async function updateBuildingFormAction(
  _prev: BuildingFormState,
  formData: FormData
): Promise<BuildingFormState> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireLocationAdmin();
    const building_id = String(formData.get("building_id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const sort_order = Number(formData.get("sort_order") ?? 0);
    const ac_mode = String(formData.get("ac_mode") ?? "per_room") as AcMode;
    const color_hex =
      normalizeBuildingColor(String(formData.get("color_hex") ?? "")) ??
      defaultColorForAcMode(ac_mode);
    const default_price_per_night = Number(
      formData.get("default_price_per_night") ?? 0
    );

    if (!building_id || !name) {
      return { ok: false, message: t("buildingNameRequired") };
    }

    await updateBuilding({
      id: building_id,
      name,
      sort_order,
      ac_mode,
      color_hex,
      default_price_per_night,
    });

    await logAdminActivityFromSession({
      action: "building.updated",
      entityType: "building",
      entityId: building_id,
      summary: t("buildingUpdatedSummary", { name }),
      metadata: { ac_mode },
    });

    revalidateStructurePaths();
    revalidatePath("/admin/calendar");
    return { ok: true, messageKey: "buildingUpdated" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : t("deleteError"),
    };
  }
}

/** @deprecated Prefer createFloorFormAction — kept for any legacy forms */
export async function createFloorAction(formData: FormData) {
  const result = await createFloorFormAction(null, formData);
  if (!result?.ok) {
    throw new Error(result?.message ?? "Error");
  }
}

export type AdminDeleteActionResult = { error?: string };

export async function deleteBuildingAction(
  formData: FormData
): Promise<AdminDeleteActionResult | void> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireLocationAdmin();
    const { deleteBuilding } = await import("@/services/buildings");
    const building_id = String(formData.get("building_id") ?? "");
    if (!building_id) return { error: t("idMissing") };

    await deleteBuilding(building_id);
    await logAdminActivityFromSession({
      action: "building.deleted",
      entityType: "building",
      entityId: building_id,
      summary: t("buildingDeleted"),
      metadata: { building_id },
    });

    revalidateStructurePaths();
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "buildings.delete_all_rooms_or_disable_them_first") {
        return { error: t("buildingDeleteHasRooms") };
      }
      if (e.message === "buildings.delete_rooms_have_bookings") {
        return { error: t("buildingDeleteHasBookings") };
      }
    }
    return { error: t("deleteError") };
  }
}

export async function assignRoomFloorAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();
  const { assignRoomToFloor } = await import("@/services/rooms-admin");
  const room_id = String(formData.get("room_id") ?? "");
  const floor_id = String(formData.get("floor_id") ?? "").trim();

  if (!room_id) throw new Error(t("idMissing"));

  await assignRoomToFloor(room_id, floor_id || null);
  await logAdminActivityFromSession({
    action: "room.updated",
    entityType: "room",
    entityId: room_id,
    summary: t("roomFloorAssigned"),
    metadata: { floor_id: floor_id || null },
  });
  revalidateStructurePaths();
}

export async function setRoomActiveAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();
  const { setRoomActive } = await import("@/services/rooms-admin");
  const room_id = String(formData.get("room_id") ?? "");
  const is_active = String(formData.get("is_active") ?? "1") === "1";
  if (!room_id) throw new Error(t("idMissing"));

  await setRoomActive(room_id, is_active);
  await logAdminActivityFromSession({
    action: "room.updated",
    entityType: "room",
    entityId: room_id,
    summary: is_active ? t("roomActivated") : t("roomDeactivated"),
    metadata: { is_active },
  });

  revalidateStructurePaths();
  revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
  revalidatePath("/admin/calendar");
}

export async function deleteRoomFromBuildingAction(
  formData: FormData
): Promise<AdminDeleteActionResult | void> {
  const t = await getTranslations("admin.serverActions");
  try {
    await requireLocationAdmin();
    const { deleteRoom } = await import("@/services/rooms-admin");
    const room_id = String(formData.get("room_id") ?? "");
    if (!room_id) return { error: t("idMissing") };

    await deleteRoom(room_id);
    await logAdminActivityFromSession({
      action: "room.deleted",
      entityType: "room",
      entityId: room_id,
      summary: t("roomDeleted"),
      metadata: { room_id },
    });

    revalidateStructurePaths();
    revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
    revalidatePath("/admin/calendar");
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === "rooms.cannot_delete_room_with_bookings_disable_instead"
    ) {
      return { error: t("roomDeleteHasBookings") };
    }
    return { error: t("deleteError") };
  }
}
