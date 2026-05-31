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
  const tPage = await getTranslations("admin.pages.roomEdit");
  const tCommon = await getTranslations("admin.common");
  const tStruct = await getTranslations("admin.locationStructure");
  const { id } = await params;
  const { return_to } = await searchParams;
  const backToStructure = return_to === "structure";
  let room: Awaited<ReturnType<typeof getRoomById>> | null = null;

  try {
    room = await getRoomById(id);
  } catch {
    notFound();
  }

  const buildings = await listBuildings().catch(() => []);
  const types = await listRoomTypes().catch(() => []);
  const options = await listRoomOptions().catch(() => []);
  const floorsByBuilding: Record<string, Awaited<ReturnType<typeof listFloorsByBuilding>>> = {};
  const policiesByBuilding: Record<
    string,
    Awaited<ReturnType<typeof ensureBuildingPoliciesFromLegacy>>
  > = {};

  for (const b of buildings) {
    floorsByBuilding[b.id] = await listFloorsByBuilding(b.id).catch(() => []);
    policiesByBuilding[b.id] = await ensureBuildingPoliciesFromLegacy(
      b.id,
      b.ac_mode
    ).catch(() => []);
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
