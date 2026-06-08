import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantScope } from "@/lib/tenant/scope";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  buildYearStatistics,
  discoverYears,
  type ActiveRoomSnapshot,
  type StatBooking,
} from "@/domain/statistics/aggregates";
import type { StatisticsReport } from "@/domain/statistics/types";
import { listAllRooms } from "@/services/rooms-admin";
import { listBuildings } from "@/services/buildings";

const STATS_NOTE =
  "Occupancy uses today's active rooms as reference for the full history. Bookings stay in the database and reports expand automatically as operational history grows.";

async function loadAllBookingsForStatisticsImpl(
  tenantId: string
): Promise<StatBooking[]> {
  const { supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status,
      num_adults, num_children, total_price,
      created_at, confirmed_at,
      booking_rooms ( room_id, rooms ( name, price_per_night, building_id, buildings ( name ) ) )
    `
    )
    .eq("tenant_id", tenantId)
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  const out: StatBooking[] = [];
  for (const row of data ?? []) {
    const br = (row.booking_rooms ?? []) as {
      room_id: string;
      rooms:
        | {
            building_id: string;
            price_per_night: number;
            buildings: { name: string } | { name: string }[] | null;
          }
        | {
            building_id: string;
            price_per_night: number;
            buildings: { name: string } | { name: string }[] | null;
          }[]
        | null;
    }[];

    const room_ids: string[] = [];
    const building_ids: string[] = [];
    const room_prices: number[] = [];
    for (const line of br) {
      room_ids.push(line.room_id);
      const r = line.rooms;
      const room = Array.isArray(r) ? r[0] : r;
      if (room?.building_id) building_ids.push(room.building_id);
      if (room?.price_per_night != null) {
        room_prices.push(Number(room.price_per_night));
      }
    }

    out.push({
      id: row.id,
      check_in: row.check_in,
      check_out: row.check_out,
      status: row.status as StatBooking["status"],
      num_adults: row.num_adults,
      num_children: row.num_children,
      total_price: row.total_price != null ? Number(row.total_price) : null,
      created_at: row.created_at,
      confirmed_at: row.confirmed_at ?? null,
      room_ids,
      building_ids: [...new Set(building_ids)],
      room_prices,
    });
  }
  return out;
}

const getCachedBookingsForStatistics = (tenantId: string) =>
  unstable_cache(
    () => loadAllBookingsForStatisticsImpl(tenantId),
    ["bookings-statistics", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 120,
    }
  );

export async function loadAllBookingsForStatistics(): Promise<StatBooking[]> {
  const { tenantId } = await getTenantScope();
  return getCachedBookingsForStatistics(tenantId)();
}

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

export async function loadStatisticsReport(): Promise<StatisticsReport> {
  const [bookings, rooms, buildings] = await Promise.all([
    loadAllBookingsForStatistics(),
    listAllRooms(),
    listBuildings(),
  ]);

  const snapshot = activeRoomSnapshot(rooms, buildings);
  const currentYear = Number((await getEffectiveToday()).slice(0, 4));
  const yearsWithData = discoverYears(bookings, currentYear);
  const firstYear = yearsWithData[0] ?? currentYear;
  const lastYear = yearsWithData[yearsWithData.length - 1] ?? currentYear;

  const years: ReturnType<typeof buildYearStatistics>[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    years.push(buildYearStatistics(y, bookings, snapshot));
  }

  return {
    generatedAt: new Date().toISOString(),
    firstYear,
    lastYear,
    totalActiveRooms: snapshot.length,
    years,
    yearsWithData,
    note: STATS_NOTE,
  };
}
