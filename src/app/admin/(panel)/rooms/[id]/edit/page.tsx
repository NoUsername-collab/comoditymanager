import { notFound } from "next/navigation";
import { RoomEditForm } from "@/components/admin/RoomEditForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listBuildings } from "@/services/buildings";
import { listFloorsByBuilding } from "@/services/floors";
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
  const floorsByBuilding: Record<string, Awaited<ReturnType<typeof listFloorsByBuilding>>> = {};
  for (const b of buildings) {
    floorsByBuilding[b.id] = await listFloorsByBuilding(b.id).catch(() => []);
  }

  return (
    <AdminRetroPageFrame
      title={room ? `Editează cameră — ${room.name}` : "Editează cameră"}
      backHref="/admin/rooms"
      backLabel="Camere"
      className="max-w-lg"
    >
      {room && (
        <RoomEditForm
          room={room}
          buildings={buildings}
          floorsByBuilding={floorsByBuilding}
          updateRoomAction={updateRoomAction}
        />
      )}
    </AdminRetroPageFrame>
  );
}
