import { cache } from "react";
import { listBuildings } from "@/services/buildings";
import { listBookingsForRange } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { getRoomOptionSlugsByRoomIds } from "@/services/room-catalog";
import { getRoomOccupancy } from "@/services/room-occupancy";
import { listAllRooms } from "@/services/rooms-admin";

/** Core Gantt calendar payload — deduped per request via React cache(). */
export const loadCalendarCoreData = cache(
  async (rangeStart: string, rangeEnd: string, referenceDate: string) => {
    const [allRooms, allBookings, settings, buildings, occupancy] =
      await Promise.all([
        listAllRooms(),
        listBookingsForRange(rangeStart, rangeEnd),
        getPensionSettings().catch(() => null),
        listBuildings(),
        getRoomOccupancy(rangeStart, rangeEnd, {
          referenceDate,
        }),
      ] as const);

    const activeRoomIds = allRooms.filter((r) => r.is_active).map((r) => r.id);
    const optionSlugsByRoom = await getRoomOptionSlugsByRoomIds(activeRoomIds).catch(
      () => ({} as Record<string, string[]>)
    );

    return [
      allRooms,
      allBookings,
      settings,
      buildings,
      occupancy,
      optionSlugsByRoom,
    ] as const;
  }
);
