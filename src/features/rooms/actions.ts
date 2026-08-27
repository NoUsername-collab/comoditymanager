"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getBuildingDefaultPrice } from "@/services/buildings";
import { parseSelectedOptionIds } from "@/services/room-catalog";
import { createRoom, createRoomsBulk } from "@/services/rooms-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { captureTenantError } from "@/services/dev-logs";
import { revalidateStructurePaths } from "@/lib/cache/revalidate-structure";
import { getTranslations } from "next-intl/server";

function roomReturnPath(formData: FormData): string {
  const raw = String(formData.get("return_to") ?? "").trim();
  if (raw === "structure") return "/admin/settings/location/structure";
  return "";
}

function roomFormQueryParams(formData: FormData, params: URLSearchParams): URLSearchParams {
  const building = String(formData.get("building_id") ?? "").trim();
  const floor = String(formData.get("floor_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();
  if (building) params.set("building", building);
  if (floor) params.set("floor", floor);
  if (returnTo) params.set("return_to", returnTo);
  return params;
}

/** La succes — poate reveni la structură; la erori rămâne pe formular. */
function roomSuccessRedirectPath(formData: FormData): string {
  return roomReturnPath(formData) || "/admin/rooms";
}

function roomFormErrorRedirectPath(formData: FormData, params: URLSearchParams): string {
  const q = roomFormQueryParams(formData, params).toString();
  return q ? `/admin/rooms/new?${q}` : "/admin/rooms/new";
}

async function requestHostForLog(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-host") ?? h.get("host");
}

async function logCreateRoomFailure(
  error: unknown,
  context: Record<string, unknown>
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  await captureTenantError(err, {
    source: "action",
    requestPath: "/admin/rooms/new",
    requestMethod: "POST",
    requestHost: await requestHostForLog(),
    context: {
      action: "createRoomAction",
      ...context,
    },
  });
}

async function redirectRoomFormError(
  formData: FormData,
  code: string,
  extra?: URLSearchParams,
  logContext?: Record<string, unknown>
) {
  if (logContext) {
    await logCreateRoomFailure(new Error(`rooms.${code}`), {
      errorCode: code,
      building_id: String(formData.get("building_id") ?? ""),
      floor_id: String(formData.get("floor_id") ?? ""),
      create_mode: String(formData.get("create_mode") ?? ""),
      ...logContext,
    });
  }
  const params = new URLSearchParams({ error: code });
  if (extra) {
    for (const [key, value] of extra.entries()) {
      params.set(key, value);
    }
  }
  await redirect(roomFormErrorRedirectPath(formData, params));
}

export async function createRoomAction(formData: FormData) {
  const t = await getTranslations("admin.serverActions");

  try {
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
      await redirectRoomFormError(formData, "server", undefined, {
        reason: "missing_building_or_type",
      });
      return;
    }

    const building_default_price = await getBuildingDefaultPrice(building_id).catch(
      () => 0
    );

    if (create_mode === "bulk") {
      const naming_mode =
        String(formData.get("bulk_naming_mode") ?? "prefix") === "number_only"
          ? "number_only"
          : "prefix";
      const name_prefix =
        naming_mode === "number_only"
          ? ""
          : String(formData.get("name_prefix") ?? "").trim();
      const start_number = Number(formData.get("start_number") ?? 1);
      const bulk_count = Number(formData.get("bulk_count") ?? 1);

      let ids: string[];
      try {
        ({ ids } = await createRoomsBulk({
          building_id,
          floor_id: floor_id || null,
          room_type_definition_id,
          count: bulk_count,
          name_prefix,
          start_number,
          naming_mode,
          allows_extra_beds,
          max_extra_beds_per_room,
          enabled_option_ids,
          price_per_night,
          sort_order_start: sort_order,
          building_default_price,
        }));
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("rooms.bulk_duplicate_names:")) {
          const list = e.message.replace("rooms.bulk_duplicate_names:", "");
          await redirectRoomFormError(
            formData,
            "bulk_duplicate",
            new URLSearchParams({ names: list }),
            { reason: "bulk_duplicate_names", names: list }
          );
        }
        if (
          e instanceof Error &&
          e.message === "rooms.bulk_count_must_be_between_1_and_50"
        ) {
          await redirectRoomFormError(formData, "bulk_count", undefined, {
            reason: "bulk_count_invalid",
          });
        }
        if (e instanceof Error && e.message === "floors.building_mismatch") {
          await redirectRoomFormError(formData, "floor_mismatch", undefined, {
            reason: "floor_building_mismatch",
          });
        }
        if (
          e instanceof Error &&
          e.message.includes("rooms_room_type_check")
        ) {
          await redirectRoomFormError(formData, "room_type_constraint", undefined, {
            reason: "rooms_room_type_check",
            message: e.message,
          });
        }
        await logCreateRoomFailure(e, {
          reason: "bulk_create_unhandled",
          building_id,
          floor_id,
        });
        throw e;
      }

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
      const back = roomSuccessRedirectPath(formData);
      await redirect(back === "/admin/rooms" ? `${back}?bulk=${ids.length}` : back);
    }

    const name = String(formData.get("name") ?? "");
    if (!name) {
      await redirectRoomFormError(formData, "server", undefined, {
        reason: "missing_room_name",
      });
      return;
    }

    let room: { id: string };
    try {
      room = await createRoom({
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
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("rooms.duplicate_name:")) {
        const dup = e.message.replace("rooms.duplicate_name:", "");
        await redirectRoomFormError(
          formData,
          "duplicate_name",
          new URLSearchParams({ names: dup }),
          { reason: "duplicate_name", names: dup }
        );
      }
      if (e instanceof Error && e.message === "floors.building_mismatch") {
        await redirectRoomFormError(formData, "floor_mismatch", undefined, {
          reason: "floor_building_mismatch",
        });
      }
      if (
        e instanceof Error &&
        e.message.includes("rooms_room_type_check")
      ) {
        await redirectRoomFormError(formData, "room_type_constraint", undefined, {
          reason: "rooms_room_type_check",
          message: e.message,
        });
      }
      await logCreateRoomFailure(e, {
        reason: "single_create_unhandled",
        building_id,
        floor_id,
        name,
      });
      throw e;
    }

    await logAdminActivityFromSession({
      action: "room.created",
      entityType: "room",
      entityId: room.id,
      summary: t("newRoomSummary", { name }),
      metadata: { building_id, room_type_definition_id },
    });

    revalidateStructurePaths();
    revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
    await redirect(roomSuccessRedirectPath(formData));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    await logCreateRoomFailure(e, { reason: "outer_catch" });
    await redirectRoomFormError(formData, "server");
  }
}
