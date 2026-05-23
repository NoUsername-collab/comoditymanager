import { Suspense } from "react";
import { GanttCalendar } from "@/components/admin/GanttCalendar";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { GanttToolbar } from "@/components/admin/gantt/GanttToolbar";
import type { GanttViewMode } from "@/components/admin/gantt/GanttToolbar";
import {
  navigateRange,
  resolveGanttRange,
} from "@/domain/gantt/view-range";
import { listBuildings } from "@/services/buildings";
import { listAllRooms } from "@/services/rooms-admin";
import { listBookingsForRange, listUnassignedCereri } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { buildCalendarQuery, parseGanttFilter } from "@/lib/gantt-query";

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
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.y) || now.getFullYear();
  const month = params.m !== undefined ? Number(params.m) : now.getMonth();
  const view = (params.view as GanttViewMode) || "all";
  const filter = parseGanttFilter(params.filter);
  const quarter =
    params.q !== undefined ? Number(params.q) : Math.floor(month / 3);

  const viewRange = resolveGanttRange({
    y: year,
    m: month,
    zoom: params.zoom,
    ws: params.ws,
    q: quarter,
  });

  const prev = navigateRange(viewRange, -1, year, month);
  const next = navigateRange(viewRange, 1, year, month);

  const q = (nav: typeof prev) =>
    buildCalendarQuery({
      y: nav.y,
      m: nav.m,
      view,
      building: params.building,
      room: params.room,
      zoom: nav.zoom,
      ws: nav.ws,
      q: nav.q,
      filter,
    });

  try {
    const [allRoomsRaw, allBookings, unassignedCereri, settings, buildingsRaw] =
      await Promise.all([
        listAllRooms(),
        listBookingsForRange(viewRange.rangeStart, viewRange.rangeEnd),
        listUnassignedCereri(),
        getPensionSettings().catch(() => null),
        listBuildings(),
      ]);
    const activeBuildings = buildingsRaw.filter((b) => b.is_active);
    const allRooms = allRoomsRaw.filter((r) => r.is_active);
    const checkInTime =
      settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
    const checkOutTime =
      settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

    const buildingById = new Map(activeBuildings.map((b) => [b.id, b]));

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
      };
    });

    let ganttRooms = ganttRoomsAll;

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

    const switcherBuildings = activeBuildings.map((b) => ({
      id: b.id,
      name: b.name,
      color_hex: b.color_hex,
    }));

    return (
      <AdminRetroPageFrame
        title="Calendar Gantt — Casa Emil"
        description="Vedere lună, săptămână, trimestru — filtre clădire și cameră."
        className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mb-4">
          <Suspense
            fallback={
              <div className="gantt-chrome gantt-toolbar--loading" aria-hidden />
            }
          >
            <GanttToolbar
              year={year}
              month={month}
              zoom={viewRange.zoom}
              ws={viewRange.zoom === "week" ? viewRange.days[0].iso : undefined}
              quarter={
                viewRange.zoom === "quarter"
                  ? Number(viewRange.periodKey.split("-")[2])
                  : undefined
              }
              filter={filter}
              buildings={switcherBuildings}
              rooms={ganttRoomsAll}
              periodTitle={viewRange.title}
              prevHref={`/admin/calendar?${q(prev)}`}
              nextHref={`/admin/calendar?${q(next)}`}
              cereri={unassignedCereri}
            />
          </Suspense>
        </div>

        <RetroXpWindow title="Gantt" className="w-full">
          <GanttCalendar
            viewRange={viewRange}
            rooms={ganttRooms}
            bookings={allBookings}
            groupByBuilding={view === "all"}
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
            filter={filter}
          />
        </RetroXpWindow>
      </AdminRetroPageFrame>
    );
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
}
