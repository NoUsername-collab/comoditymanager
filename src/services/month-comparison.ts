import { buildMonthComparison, type MonthComparison } from "@/domain/statistics/month-compare";
import type { ActiveRoomSnapshot } from "@/domain/statistics/aggregates";
import { loadAllBookingsForStatistics } from "@/services/statistics";
import { listAllRooms } from "@/services/rooms-admin";
import { listBuildings } from "@/services/buildings";

function activeRoomSnapshot(
  rooms: Awaited<ReturnType<typeof listAllRooms>>,
  buildings: Awaited<ReturnType<typeof listBuildings>>
): ActiveRoomSnapshot[] {
  const buildingName = new Map(buildings.map((b) => [b.id, b.name]));
  return rooms
    .filter((r) => r.is_active)
    .map((r) => ({
      id: r.id,
      building_id: r.building_id,
      building_name: buildingName.get(r.building_id) ?? r.building_name,
    }));
}

export async function loadMonthComparison(): Promise<MonthComparison> {
  const [bookings, rooms, buildings] = await Promise.all([
    loadAllBookingsForStatistics(),
    listAllRooms(),
    listBuildings(),
  ]);
  return buildMonthComparison(bookings, activeRoomSnapshot(rooms, buildings));
}
