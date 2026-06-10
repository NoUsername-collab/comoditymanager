import { cache } from "react";
import { listBuildings } from "@/services/buildings";
import { listBookingsForRange } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { getRoomOptionSlugsByRoomIds } from "@/services/room-catalog";
import { getRoomOccupancy } from "@/services/room-occupancy";
import { listAllFloors } from "@/services/floors";
import { listAllRooms } from "@/services/rooms-admin";

/** Core Gantt calendar payload — deduped per request via React cache(). */
export const loadCalendarCoreData = cache(
  async (rangeStart: string, rangeEnd: string, referenceDate: string) => {
    const roomsPromise = listAllRooms();
    const [allRooms, allBookings, settings, buildings, floors, occupancy, optionSlugsByRoom] =
      await Promise.all([
        roomsPromise,
        listBookingsForRange(rangeStart, rangeEnd),
        getPensionSettings().catch(() => null),
        listBuildings(),
        listAllFloors(),
        getRoomOccupancy(rangeStart, rangeEnd, {
          referenceDate,
        }),
        roomsPromise
          .then((rooms) =>
            getRoomOptionSlugsByRoomIds(
              rooms.filter((r) => r.is_active).map((r) => r.id)
            )
          )
          .catch(() => ({} as Record<string, string[]>)),
      ] as const);

    return [
      allRooms,
      allBookings,
      settings,
      buildings,
      floors,
      occupancy,
      optionSlugsByRoom,
    ] as const;
  }
);
