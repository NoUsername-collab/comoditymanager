import { notFound } from "next/navigation";
import { RoomEditForm } from "@/components/admin/RoomEditForm";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { listBuildings } from "@/services/buildings";
import { listAllFloors } from "@/services/floors";
import {
  ensureBuildingPoliciesFromLegacy,
  listRoomOptions,
  listRoomTypes,
} from "@/services/room-catalog";
import { getRoomById } from "@/services/rooms-admin";
import { updateRoomAction } from "./actions";
import { getTranslations } from "next-intl/server";

export default async function EditRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return_to?: string }>;
}) {
  const [tPage, tCommon, tStruct, { id }, { return_to }] = await Promise.all([
    getTranslations("admin.pages.roomEdit"),
    getTranslations("admin.common"),
    getTranslations("admin.locationStructure"),
    params,
    searchParams,
  ]);
  const backToStructure = return_to === "structure";

  const buildingsPromise = listBuildings().catch(
    () => [] as Awaited<ReturnType<typeof listBuildings>>
  );
  const [room, buildings, types, options, allFloors, policyResults] =
    await Promise.all([
      getRoomById(id).catch(() => null),
      buildingsPromise,
      listRoomTypes().catch(() => []),
      listRoomOptions().catch(() => []),
      listAllFloors().catch(() => []),
      buildingsPromise.then((loadedBuildings) =>
        Promise.all(
          loadedBuildings.map((b) =>
            ensureBuildingPoliciesFromLegacy(b.id, b.ac_mode).catch(
              () => [] as Awaited<ReturnType<typeof ensureBuildingPoliciesFromLegacy>>
            )
          )
        )
      ),
    ]);
  if (!room) notFound();
  const floorsByBuilding: Record<string, Awaited<ReturnType<typeof listAllFloors>>> =
    {};
  const policiesByBuilding: Record<
    string,
    Awaited<ReturnType<typeof ensureBuildingPoliciesFromLegacy>>
  > = {};
  for (let i = 0; i < buildings.length; i += 1) {
    const building = buildings[i];
    floorsByBuilding[building.id] = allFloors.filter(
      (floor) => floor.building_id === building.id
    );
    policiesByBuilding[building.id] = policyResults[i];
  }

  return (
    <AdminPageFrame
      title={room ? tPage("titleWithName", { name: room.name }) : tPage("title")}
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
      {room && types.length > 0 && (
        <RoomEditForm
          room={room}
          buildings={buildings}
          floorsByBuilding={floorsByBuilding}
          types={types}
          options={options}
          policiesByBuilding={policiesByBuilding}
          updateRoomAction={updateRoomAction}
          returnTo={backToStructure ? "structure" : undefined}
        />
      )}
    </AdminPageFrame>
  );
}
