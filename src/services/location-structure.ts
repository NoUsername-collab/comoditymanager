import { listBuildings } from "@/services/buildings";
import { listFloorsByBuilding } from "@/services/floors";
import { listAllRooms } from "@/services/rooms-admin";
import type { Building, Floor } from "@/types/database";

export type StructureRoom = {
  id: string;
  name: string;
  building_id: string;
  floor_id: string | null;
  is_active: boolean;
  capacity_base: number;
  sort_order: number;
};

export type StructureFloor = Floor & {
  rooms: StructureRoom[];
  duplicateName: boolean;
};

export type StructureBuilding = {
  building: Building;
  floors: StructureFloor[];
  roomsWithoutFloor: StructureRoom[];
  roomCount: number;
  activeRoomCount: number;
};

export async function listLocationStructure(): Promise<StructureBuilding[]> {
  const [buildings, allRooms] = await Promise.all([listBuildings(), listAllRooms()]);

  return Promise.all(
    buildings.map(async (building) => {
      const floors = await listFloorsByBuilding(building.id);
      const rooms = allRooms
        .filter((r) => r.building_id === building.id)
        .map(
          (r): StructureRoom => ({
            id: r.id,
            name: r.name,
            building_id: r.building_id,
            floor_id: r.floor_id,
            is_active: r.is_active,
            capacity_base: r.capacity_base,
            sort_order: r.sort_order,
          })
        );

      const nameCounts = new Map<string, number>();
      for (const floor of floors) {
        const key = floor.name.trim().toLowerCase();
        nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
      }

      const floorsWithRooms: StructureFloor[] = floors.map((floor) => {
        const key = floor.name.trim().toLowerCase();
        return {
          ...floor,
          duplicateName: (nameCounts.get(key) ?? 0) > 1,
          rooms: rooms
            .filter((r) => r.floor_id === floor.id)
            .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
        };
      });

      const roomsWithoutFloor = rooms
        .filter((r) => !r.floor_id)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

      const activeRoomCount = rooms.filter((r) => r.is_active).length;

      return {
        building,
        floors: floorsWithRooms,
        roomsWithoutFloor,
        roomCount: rooms.length,
        activeRoomCount,
      };
    })
  );
}
