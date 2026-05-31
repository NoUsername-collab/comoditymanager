import { Link } from "@/i18n/navigation";
import { RoomForm } from "@/components/admin/RoomForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listBuildings } from "@/services/buildings";
import { listFloorsByBuilding } from "@/services/floors";
import {
  ensureBuildingPoliciesFromLegacy,
  getBuildingOptionPolicies,
  listRoomOptions,
  listRoomTypes,
} from "@/services/room-catalog";
import { createRoomAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string; floor?: string; return_to?: string }>;
}) {
  const tPage = await getTranslations("admin.pages.roomsNew");
  const tCommon = await getTranslations("admin.common");
  const tStruct = await getTranslations("admin.locationStructure");
  const {
    building: defaultBuildingId,
    floor: defaultFloorId,
    return_to,
  } = await searchParams;
  const backToStructure = return_to === "structure";
  let buildings: Awaited<ReturnType<typeof listBuildings>> = [];
  let types: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let options: Awaited<ReturnType<typeof listRoomOptions>> = [];
  let loadError: string | null = null;
  let catalogMissing = false;

  try {
    buildings = await listBuildings();
    types = await listRoomTypes();
    options = await listRoomOptions();
  } catch (e) {
    loadError = e instanceof Error ? e.message : tCommon("error");
    if (String(loadError).includes("room_type_definitions")) {
      catalogMissing = true;
    }
  }

  const floorsByBuilding: Record<
    string,
    Awaited<ReturnType<typeof listFloorsByBuilding>>
  > = {};
  const policiesByBuilding: Record<
    string,
    Awaited<ReturnType<typeof getBuildingOptionPolicies>>
  > = {};

  if (buildings.length > 0) {
    for (const b of buildings) {
      try {
        floorsByBuilding[b.id] = await listFloorsByBuilding(b.id);
      } catch {
        floorsByBuilding[b.id] = [];
      }
      try {
        policiesByBuilding[b.id] = await ensureBuildingPoliciesFromLegacy(
          b.id,
          b.ac_mode
        );
      } catch {
        policiesByBuilding[b.id] = [];
      }
    }
  }

  return (
    <AdminRetroPageFrame
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
            defaultBuildingId={defaultBuildingId}
            defaultFloorId={defaultFloorId}
            returnTo={backToStructure ? "structure" : undefined}
          />
        )
      )}
    </AdminRetroPageFrame>
  );
}
