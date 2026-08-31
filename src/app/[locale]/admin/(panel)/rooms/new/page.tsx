import { Link } from "@/i18n/navigation";
import { RoomForm } from "@/features/rooms/ui/RoomForm";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { loadNewRoomPage } from "@/features/rooms/loaders";
import { roomScopeKey } from "@/domain/room/scope-key";
import { createRoomAction } from "../actions";
import { guardOperatorRoute } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<{
    building?: string;
    floor?: string;
    return_to?: string;
    error?: string;
    names?: string;
  }>;
}) {
  await guardOperatorRoute("/admin/rooms/new");
  const [
    tPage,
    tActions,
    tCommon,
    tStruct,
    {
      building: defaultBuildingId,
      floor: defaultFloorId,
      return_to,
      error: errorCode,
      names: errorNames,
    },
  ] = await Promise.all([
    getTranslations("admin.pages.roomsNew"),
    getTranslations("admin.serverActions"),
    getTranslations("admin.common"),
    getTranslations("admin.locationStructure"),
    searchParams,
  ]);
  const backToStructure = return_to === "structure";
  const {
    buildings,
    types,
    options,
    allRooms,
    allFloors,
    policyResults,
    loadError: loadErrorRaw,
  } = await loadNewRoomPage();
  let loadError: string | null = null;
  let catalogMissing = false;
  if (loadErrorRaw) {
    loadError =
      loadErrorRaw instanceof Error ? loadErrorRaw.message : tCommon("error");
    if (String(loadError).includes("room_type_definitions")) {
      catalogMissing = true;
    }
  }

  const floorsByBuilding: Record<
    string,
    (typeof allFloors)[number][]
  > = {};
  const policiesByBuilding: Record<string, (typeof policyResults)[number]> =
    {};

  const existingNamesByScope: Record<string, string[]> = {};
  const nextSortByBuilding: Record<string, number> = {};
  let formError: string | null = null;

  if (errorCode === "bulk_duplicate" && errorNames) {
    formError = tActions("bulkDuplicateNames", {
      names: errorNames.replace(/\|/g, ", "),
    });
  } else if (errorCode === "duplicate_name" && errorNames) {
    formError = tActions("bulkDuplicateNames", { names: errorNames });
  } else if (errorCode === "bulk_count") {
    formError = tPage("bulkCountError");
  } else if (errorCode === "floor_mismatch") {
    formError = tActions("floorBuildingMismatch");
  } else if (errorCode === "room_type_constraint") {
    formError = tActions("roomTypeConstraint");
  } else if (errorCode === "server") {
    formError = tCommon("error");
  }

  if (buildings.length > 0) {
    for (let i = 0; i < buildings.length; i += 1) {
      policiesByBuilding[buildings[i].id] = policyResults[i] ?? [];
    }

    try {
      for (const b of buildings) {
        floorsByBuilding[b.id] = allFloors.filter(
          (floor) => floor.building_id === b.id
        );
        const rooms = allRooms.filter((r) => r.building_id === b.id);
        for (const room of rooms) {
          const key = roomScopeKey(b.id, room.floor_id);
          if (!existingNamesByScope[key]) existingNamesByScope[key] = [];
          existingNamesByScope[key].push(room.name);
        }
        nextSortByBuilding[b.id] =
          rooms.reduce((max, r) => Math.max(max, r.sort_order), 0) + 1;
      }
    } catch {
      for (const b of buildings) {
        nextSortByBuilding[b.id] = 1;
        floorsByBuilding[b.id] = [];
      }
    }
  }

  return (
    <AdminPageFrame
      title={tCommon("newRoomTitle")}
      backHref={
        backToStructure
          ? "/admin/settings/location/structure"
          : "/admin/rooms"
      }
      backLabel={
        backToStructure ? tStruct("pageTitle") : tCommon("rooms")
      }
      className="max-w-lg"
    >
      {catalogMissing && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {tPage("catalogRunMigration")}{" "}
          <code className="text-xs">015_room_catalog.sql</code> {tCommon("catalogSqlHint")}.
        </p>
      )}

      {loadError && !catalogMissing && (
        <p className="text-sm text-red-600">{loadError}</p>
      )}

      {buildings.length === 0 && !loadError ? (
        <p className="text-zinc-600">
          {tPage("addBuildingFirst")}{" "}
          <Link href="/admin/buildings/new" className="underline">
            {tCommon("newBuilding").toLowerCase()}
          </Link>
          .
        </p>
      ) : (
        types.length > 0 && (
          <RoomForm
            buildings={buildings}
            floorsByBuilding={floorsByBuilding}
            types={types}
            options={options}
            policiesByBuilding={policiesByBuilding}
            createRoomAction={createRoomAction}
            existingNamesByScope={existingNamesByScope}
            nextSortByBuilding={nextSortByBuilding}
            defaultBuildingId={defaultBuildingId}
            defaultFloorId={defaultFloorId}
            returnTo={backToStructure ? "structure" : undefined}
            formError={formError}
          />
        )
      )}
    </AdminPageFrame>
  );
}
