import Link from "next/link";
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

export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building: defaultBuildingId } = await searchParams;
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
    loadError = e instanceof Error ? e.message : "Eroare";
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
      title="Cameră nouă — Casa Emil"
      backHref="/admin/rooms"
      backLabel="Camere"
      className="max-w-lg"
    >
      {catalogMissing && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Rulează migrarea{" "}
          <code className="text-xs">015_room_catalog.sql</code> pentru tipuri și
          opțiuni modulare.
        </p>
      )}

      {loadError && !catalogMissing && (
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
        types.length > 0 && (
          <RoomForm
            buildings={buildings}
            floorsByBuilding={floorsByBuilding}
            types={types}
            options={options}
            policiesByBuilding={policiesByBuilding}
            createRoomAction={createRoomAction}
            defaultBuildingId={defaultBuildingId}
          />
        )
      )}
    </AdminRetroPageFrame>
  );
}
