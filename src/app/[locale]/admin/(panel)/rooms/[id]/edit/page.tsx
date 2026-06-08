import { notFound } from "next/navigation";
import { RoomEditForm } from "@/components/admin/RoomEditForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listBuildings } from "@/services/buildings";
import { listFloorsByBuilding } from "@/services/floors";
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

  const [room, buildings, types, options] = await Promise.all([
    getRoomById(id).catch(() => null),
    listBuildings().catch(() => []),
    listRoomTypes().catch(() => []),
    listRoomOptions().catch(() => []),
  ]);
  if (!room) notFound();
  const floorsByBuilding: Record<string, Awaited<ReturnType<typeof listFloorsByBuilding>>> = {};
  const policiesByBuilding: Record<
    string,
    Awaited<ReturnType<typeof ensureBuildingPoliciesFromLegacy>>
  > = {};

  const buildingMeta = await Promise.all(
    buildings.map(async (b) => {
      const [floors, policies] = await Promise.all([
        listFloorsByBuilding(b.id).catch(() => []),
        ensureBuildingPoliciesFromLegacy(b.id, b.ac_mode).catch(() => []),
      ]);
      return { id: b.id, floors, policies };
    })
  );
  for (const { id: buildingId, floors, policies } of buildingMeta) {
    floorsByBuilding[buildingId] = floors;
    policiesByBuilding[buildingId] = policies;
  }

  return (
    <AdminRetroPageFrame
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
    </AdminRetroPageFrame>
  );
}
