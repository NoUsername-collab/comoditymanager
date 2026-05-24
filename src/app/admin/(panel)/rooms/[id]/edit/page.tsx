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

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      title={room ? `Editează cameră — ${room.name}` : "Editează cameră"}
      backHref="/admin/rooms"
      backLabel="Camere"
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
        />
      )}
    </AdminRetroPageFrame>
  );
}
