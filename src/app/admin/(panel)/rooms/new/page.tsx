import Link from "next/link";
import { RoomForm } from "@/components/admin/RoomForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listBuildings } from "@/services/buildings";
import { listFloorsByBuilding } from "@/services/floors";
import { createRoomAction } from "../actions";

export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building: defaultBuildingId } = await searchParams;
  let buildings: Awaited<ReturnType<typeof listBuildings>> = [];
  let loadError: string | null = null;

  try {
    buildings = await listBuildings();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Eroare";
  }

  const floorsByBuilding: Record<
    string,
    Awaited<ReturnType<typeof listFloorsByBuilding>>
  > = {};

  if (buildings.length > 0) {
    for (const b of buildings) {
      try {
        floorsByBuilding[b.id] = await listFloorsByBuilding(b.id);
      } catch {
        floorsByBuilding[b.id] = [];
      }
    }
  }

  return (
    <AdminRetroPageFrame
      title="Cameră nouă — Casa Emil"
      backHref="/admin/rooms"
      backLabel="Camere"
      className="max-w-lg"
    >
      {loadError && (
        <p className="text-sm text-red-600">{loadError}</p>
      )}

      {buildings.length === 0 && !loadError ? (
        <p className="text-zinc-600">
          Adaugă mai întâi o{" "}
          <Link href="/admin/buildings/new" className="underline">
            clădire
          </Link>
          .
        </p>
      ) : (
        <RoomForm
          buildings={buildings}
          floorsByBuilding={floorsByBuilding}
          createRoomAction={createRoomAction}
          defaultBuildingId={defaultBuildingId}
        />
      )}
    </AdminRetroPageFrame>
  );
}
