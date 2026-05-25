import { GanttCalendar } from "@/components/admin/GanttCalendar";
import { GanttCereriQueue } from "@/components/admin/gantt/GanttCereriQueue";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import type { GanttViewMode } from "@/components/admin/gantt/GanttToolbar";
import { resolveGanttRange } from "@/domain/gantt/view-range";
import { listBuildings } from "@/services/buildings";
import { listAllRooms } from "@/services/rooms-admin";
import { listBookingsForRange } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { parseGanttFilter, parseGanttFeatureFilter } from "@/lib/gantt-query";
import { filterGanttRoomsByFeature } from "@/domain/gantt/filters";
import { getRoomOptionSlugsByRoomIds } from "@/services/room-catalog";
import { parseGanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import { getRoomOccupancy } from "@/services/room-occupancy";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    y?: string;
    m?: string;
    view?: string;
    building?: string;
    room?: string;
    zoom?: string;
    ws?: string;
    q?: string;
    filter?: string;
    layer?: string;
    feat?: string;
    fd?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.y) || now.getFullYear();
  const month = params.m !== undefined ? Number(params.m) : now.getMonth();
  const view = (params.view as GanttViewMode) || "all";
  const filter = parseGanttFilter(params.filter);
  const feat = parseGanttFeatureFilter(params.feat);
  const layer = parseGanttLayerFilter(params.layer);
  const focusDay =
    params.fd && /^\d{4}-\d{2}-\d{2}$/.test(params.fd) ? params.fd : null;
  const quarter =
    params.q !== undefined ? Number(params.q) : Math.floor(month / 3);

  const viewRange = resolveGanttRange({
    y: year,
    m: month,
    zoom: params.zoom,
    ws: params.ws,
    q: quarter,
  });

  let data: Awaited<
    ReturnType<typeof Promise.all<[
      ReturnType<typeof listAllRooms>,
      ReturnType<typeof listBookingsForRange>,
      ReturnType<typeof getPensionSettings>,
      ReturnType<typeof listBuildings>,
      ReturnType<typeof getRoomOccupancy>
    ]>>
  >;

  try {
    data = await Promise.all([
      listAllRooms(),
      listBookingsForRange(viewRange.rangeStart, viewRange.rangeEnd),
      getPensionSettings().catch(() => null),
      listBuildings(),
      getRoomOccupancy(viewRange.rangeStart, viewRange.rangeEnd),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Eroare";
    return (
      <AdminRetroPageFrame title="Calendar — Casa Emil">
        <p className="text-red-600">{msg}</p>
        <p className="mt-2 text-sm">
          Calendarul nu poate fi încărcat. Verifică conexiunea la baza de date și
          încearcă din nou.
        </p>
      </AdminRetroPageFrame>
    );
  }

  const [allRoomsRaw, allBookings, settings, buildingsRaw, occupancy] = data;
  const activeBuildings = buildingsRaw.filter((b) => b.is_active);
  const allRooms = allRoomsRaw.filter((r) => r.is_active);
  const checkInTime =
    settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
  const checkOutTime =
    settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

  const buildingById = new Map(activeBuildings.map((b) => [b.id, b]));

  const roomIds = allRooms.map((r) => r.id);
  const optionSlugsByRoom = await getRoomOptionSlugsByRoomIds(roomIds).catch(
    () => ({} as Record<string, string[]>)
  );

  const ganttRoomsAll = allRooms.map((r) => {
    const building = buildingById.get(r.building_id);
    return {
      id: r.id,
      name: r.name,
      building_id: r.building_id,
      building_name: r.building_name,
      building_color: building?.color_hex ?? null,
      building_ac_mode: building?.ac_mode ?? "per_room",
      has_ac: r.has_ac,
      room_type_name: r.room_type_name,
      option_slugs: optionSlugsByRoom[r.id] ?? [],
    };
  });

  let ganttRooms = filterGanttRoomsByFeature(ganttRoomsAll, feat);

  if (view === "building") {
    const bid = params.building || activeBuildings[0]?.id;
    if (bid) {
      ganttRooms = ganttRooms.filter((r) => r.building_id === bid);
    }
  } else if (view === "room") {
    const rid = params.room || ganttRoomsAll[0]?.id;
    if (rid) {
      ganttRooms = ganttRooms.filter((r) => r.id === rid);
    }
  }

  const unassignedCereri = allBookings.filter(
    (booking) => booking.status === "cerere_noua" && booking.room_ids.length === 0
  );

  return (
    <AdminRetroPageFrame
      title="Calendar Gantt — Casa Emil"
      description={
        unassignedCereri.length > 0 ? (
          <div className="gantt-page-top-cards">
            <GanttCereriQueue
              cereri={unassignedCereri}
              top
              title="Cereri neconfirmate"
              subtitle="Fără cameră în perioada afișată"
              ariaLabel="Cereri neconfirmate fără cameră"
            />
          </div>
        ) : undefined
      }
      className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
    >
      <RetroXpWindow title="Gantt" className="w-full">
        <GanttCalendar
          viewRange={viewRange}
          rooms={ganttRooms}
          bookings={allBookings}
          occupancy={occupancy}
          groupByBuilding={view === "all"}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          filter={filter}
          featureFilter={feat}
          layerFilter={layer}
          focusDay={focusDay}
        />
      </RetroXpWindow>
    </AdminRetroPageFrame>
  );
}
