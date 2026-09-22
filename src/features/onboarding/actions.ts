"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/auth/require-staff";
import { parseOperationalHours } from "@/domain/settings/operational-hours";
import { bustPensionSettingsCache } from "@/lib/cache/revalidate-settings";
import { revalidateStructurePaths } from "@/lib/cache/revalidate-structure";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { defaultColorForAcMode } from "@/lib/building-color-palette";
import { acModeToPolicyMode } from "@/lib/room-catalog-pricing";
import {
  getPensionSettings,
  updatePensionSettingsPartial,
} from "@/services/pension-settings";
import { createBuilding, getBuildingDefaultPrice, listBuildings } from "@/services/buildings";
import { createRoom } from "@/services/rooms-admin";
import {
  listRoomOptions,
  listRoomTypes,
  setBuildingOptionPolicies,
} from "@/services/room-catalog";
import { logAdminActivityFromSession } from "@/services/activity-log";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import type { OptionPolicyMode } from "@/types/room-catalog";

const MAX_ONBOARDING_ROOMS = 12;
const DEFAULT_BUILDING_PRICE = 250;

export type OnboardingActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveOnboardingStep1Action(
  formData: FormData
): Promise<OnboardingActionResult> {
  const t = await getTranslations("admin.onboarding");
  try {
    await requireStaffPermission("pension_settings");
    const tActions = await getTranslations("admin.serverActions");
    const displayName = String(formData.get("display_name") ?? "").trim();
    const parsedHours = parseOperationalHours({
      checkInTime: String(formData.get("default_check_in_time") ?? DEFAULT_CHECK_IN_TIME),
      checkOutTime: String(formData.get("default_check_out_time") ?? DEFAULT_CHECK_OUT_TIME),
      extraBedsMax: 0,
    });

    if (!displayName || displayName.length < 2) {
      return { ok: false, error: t("genericError") };
    }
    if (!parsedHours.ok) {
      if (parsedHours.error === "settings.checkout_must_be_before_checkin") {
        return { ok: false, error: tActions("checkoutMustBeBeforeCheckin") };
      }
      return { ok: false, error: tActions("invalidStayHours") };
    }

    await updatePensionSettingsPartial({
      display_name: displayName,
      default_check_in_time: parsedHours.data.checkInTime,
      default_check_out_time: parsedHours.data.checkOutTime,
    });

    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: `Onboarding step 1: ${displayName}`,
      metadata: { step: 1 },
    });

    bustPensionSettingsCache(await resolveTenantIdForData());
    revalidatePath("/admin");
    revalidatePath("/admin/onboarding");
    return { ok: true };
  } catch {
    return { ok: false, error: t("genericError") };
  }
}

export async function saveOnboardingInventoryAction(
  formData: FormData
): Promise<OnboardingActionResult> {
  const t = await getTranslations("admin.onboarding");
  try {
    await requireStaffPermission("location_structure");

    const names = formData.getAll("room_name").map((v) => String(v).trim());
    const typeIds = formData.getAll("room_type_id").map((v) => String(v).trim());
    const prices = formData.getAll("room_price").map((v) => String(v).trim());

    const rows = names
      .map((name, index) => ({
        name,
        typeId: typeIds[index] ?? "",
        priceRaw: prices[index] ?? "",
      }))
      .filter((row) => row.name.length > 0)
      .slice(0, MAX_ONBOARDING_ROOMS);

    if (rows.length === 0) {
      return { ok: false, error: t("inventoryEmpty") };
    }
    if (rows.some((row) => !row.typeId)) {
      return { ok: false, error: t("inventoryNoType") };
    }

    const types = await listRoomTypes();
    const typeById = new Map(types.map((type) => [type.id, type]));
    if (rows.some((row) => !typeById.has(row.typeId))) {
      return { ok: false, error: t("inventoryNoType") };
    }

    const existingId = String(formData.get("building_id") ?? "").trim();
    const buildingName =
      String(formData.get("building_name") ?? "").trim() ||
      String((await getPensionSettings())?.display_name ?? "").trim();

    const buildings = await listBuildings();
    let buildingId = existingId && buildings.some((b) => b.id === existingId)
      ? existingId
      : buildings[0]?.id ?? "";

    if (!buildingId) {
      if (!buildingName) {
        return { ok: false, error: t("genericError") };
      }
      const created = await createBuilding({
        name: buildingName,
        sort_order: 0,
        color_hex: defaultColorForAcMode("per_room"),
        ac_mode: "per_room",
        default_price_per_night: DEFAULT_BUILDING_PRICE,
      });
      buildingId = created.id;

      try {
        const options = await listRoomOptions(true);
        const policies = options.map((opt) => ({
          option_id: opt.id,
          mode: (opt.slug === "ac"
            ? acModeToPolicyMode("per_room")
            : "per_room") as OptionPolicyMode,
        }));
        await setBuildingOptionPolicies(buildingId, policies);
      } catch {
        /* catalog policies may be missing on a fresh tenant */
      }
    }

    const buildingDefaultPrice = await getBuildingDefaultPrice(buildingId);

    for (const [index, row] of rows.entries()) {
      const type = typeById.get(row.typeId);
      const parsedPrice = Number(row.priceRaw);
      const price_per_night =
        Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0;

      await createRoom({
        building_id: buildingId,
        floor_id: null,
        name: row.name,
        room_type_definition_id: row.typeId,
        capacity_base: type?.capacity_base ?? 2,
        allows_extra_beds: false,
        max_extra_beds_per_room: 0,
        enabled_option_ids: [],
        price_per_night,
        sort_order: index,
        building_default_price: buildingDefaultPrice,
      });
    }

    await logAdminActivityFromSession({
      action: "room.created",
      entityType: "room",
      summary: `Onboarding inventory: ${rows.length} rooms`,
      metadata: { step: 2, count: rows.length, buildingId },
    });

    const tenantId = await resolveTenantIdForData();
    revalidateStructurePaths(tenantId);
    revalidatePath("/admin");
    revalidatePath("/admin/onboarding");
    return { ok: true };
  } catch {
    return { ok: false, error: t("genericError") };
  }
}
