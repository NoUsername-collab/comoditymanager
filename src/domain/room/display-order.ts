export type RoomDisplayOrderInput = {
  id: string;
  building_id: string;
  floor_id: string | null;
  name: string;
  sort_order: number;
};

export type BuildingDisplayOrderInput = {
  id: string;
  sort_order: number;
};

export type FloorDisplayOrderInput = {
  id: string;
  building_id: string;
  sort_order: number;
};

function compareBuildingOrder(
  a: BuildingDisplayOrderInput,
  b: BuildingDisplayOrderInput
): number {
  return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
}

/** Aceeași ordine ca în Setări → Locație → Structură. */
export function sortRoomsLikeLocationStructure<T extends RoomDisplayOrderInput>(
  rooms: T[],
  buildings: BuildingDisplayOrderInput[],
  floors: FloorDisplayOrderInput[]
): T[] {
  const buildingRank = new Map(
    [...buildings]
      .sort(compareBuildingOrder)
      .map((building, index) => [building.id, index] as const)
  );

  const floorsByBuilding = new Map<string, FloorDisplayOrderInput[]>();
  for (const building of [...buildings].sort(compareBuildingOrder)) {
    const buildingFloors = floors
      .filter((floor) => floor.building_id === building.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    floorsByBuilding.set(building.id, buildingFloors);
  }

  const floorRank = (room: RoomDisplayOrderInput): number => {
    const buildingFloors = floorsByBuilding.get(room.building_id) ?? [];
    if (!room.floor_id) return buildingFloors.length;
    const index = buildingFloors.findIndex((floor) => floor.id === room.floor_id);
    return index >= 0 ? index : buildingFloors.length;
  };

  return [...rooms].sort((a, b) => {
    const buildingDelta =
      (buildingRank.get(a.building_id) ?? Number.MAX_SAFE_INTEGER) -
      (buildingRank.get(b.building_id) ?? Number.MAX_SAFE_INTEGER);
    if (buildingDelta !== 0) return buildingDelta;

    const floorDelta = floorRank(a) - floorRank(b);
    if (floorDelta !== 0) return floorDelta;

    const sortDelta = a.sort_order - b.sort_order;
    if (sortDelta !== 0) return sortDelta;

    return a.name.localeCompare(b.name, "ro");
  });
}
