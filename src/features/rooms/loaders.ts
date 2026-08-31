import { listBuildings } from "@/services/buildings";
import { listAllFloors } from "@/services/floors";
import {
  ensureBuildingPoliciesFromLegacy,
  getBuildingOptionPolicies,
  listRoomOptions,
  listRoomTypes,
} from "@/services/room-catalog";
import { getRoomById, listAllRooms } from "@/services/rooms-admin";

export async function loadNewRoomPage() {
  const buildingsPromise = listBuildings();
  let buildings: Awaited<ReturnType<typeof listBuildings>> = [];
  let types: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let options: Awaited<ReturnType<typeof listRoomOptions>> = [];
  let allRooms: Awaited<ReturnType<typeof listAllRooms>> = [];
  let allFloors: Awaited<ReturnType<typeof listAllFloors>> = [];
  let policyResults: Awaited<ReturnType<typeof getBuildingOptionPolicies>>[] = [];
  let loadError: unknown = null;

  try {
    [buildings, types, options, allRooms, allFloors, policyResults] =
      await Promise.all([
        buildingsPromise,
        listRoomTypes(),
        listRoomOptions(),
        listAllRooms(),
        listAllFloors(),
        buildingsPromise.then((loadedBuildings) =>
          Promise.all(
            loadedBuildings.map((b) =>
              ensureBuildingPoliciesFromLegacy(b.id, b.ac_mode).catch(
                () => [] as Awaited<ReturnType<typeof getBuildingOptionPolicies>>,
              ),
            ),
          ),
        ),
      ]);
  } catch (e) {
    loadError = e;
  }

  return {
    buildings,
    types,
    options,
    allRooms,
    allFloors,
    policyResults,
    loadError,
  };
}

export async function loadEditRoomPage(roomId: string) {
  const buildingsPromise = listBuildings().catch(
    () => [] as Awaited<ReturnType<typeof listBuildings>>,
  );
  const [room, buildings, types, options, allFloors, policyResults] =
    await Promise.all([
      getRoomById(roomId).catch(() => null),
      buildingsPromise,
      listRoomTypes().catch(() => []),
      listRoomOptions().catch(() => []),
      listAllFloors().catch(() => []),
      buildingsPromise.then((loadedBuildings) =>
        Promise.all(
          loadedBuildings.map((b) =>
            ensureBuildingPoliciesFromLegacy(b.id, b.ac_mode).catch(
              () =>
                [] as Awaited<
                  ReturnType<typeof ensureBuildingPoliciesFromLegacy>
                >,
            ),
          ),
        ),
      ),
    ]);

  if (!room) return null;

  return { room, buildings, types, options, allFloors, policyResults };
}
