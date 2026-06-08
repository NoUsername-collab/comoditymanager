import { AvailabilityDashboard } from "@/components/admin/availability/AvailabilityDashboard";
import { GanttCalendarLazy } from "@/components/admin/GanttCalendarLazy";
import { GanttAvailabilityHeatmapPanel } from "@/components/admin/gantt/GanttAvailabilityHeatmapPanel";
import { GanttCereriQueue } from "@/components/admin/gantt/GanttCereriQueue";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import type { GanttViewMode } from "@/components/admin/gantt/GanttToolbar";
import { readAvailabilityPanelState, mergeAvailabilityPanelSearch } from "@/lib/availability-panel-query";
import { resolveGanttRange } from "@/domain/gantt/view-range";
import { listBuildings } from "@/services/buildings";
import { listAllRooms } from "@/services/rooms-admin";
import { listBookingsForRange } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { loadAvailabilityDashboard } from "@/services/availability-month";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { parseGanttFilter, parseGanttFeatureFilter } from "@/lib/gantt-query";
import { filterGanttRoomsByFeature } from "@/domain/gantt/filters";
import { getRoomOptionSlugsByRoomIds } from "@/services/room-catalog";
import { parseGanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import { getRoomOccupancy } from "@/services/room-occupancy";
import { getLocale, getTranslations } from "next-intl/server";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { parseIso } from "@/lib/stay-dates";

function toUrlSearchParams(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  return search;
}

function hrefForQuery(query: URLSearchParams) {
  const qs = query.toString();
  return qs ? `/admin/calendar?${qs}` : "/admin/calendar";
}

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
    avail?: string;
    avail_y?: string;
    avail_m?: string;
    avail_day?: string;
    avail_building?: string;
    avail_view?: string;
    avail_ws?: string;
    avail_feat?: string;
  }>;
}) {
  const t = await getTranslations("admin.pages.calendar");
  const tCommon = await getTranslations("admin.common");
  const tGanttRange = await getTranslations("admin.gantt.range");
  const locale = await getLocale();
  const params = await searchParams;
  const effectiveToday = await getEffectiveToday();
  const refDate = parseIso(effectiveToday);
  const year = Number(params.y) || refDate.getFullYear();
  const month = params.m !== undefined ? Number(params.m) : refDate.getMonth();
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
    locale,
    today: effectiveToday,
    labels: {
      today: tCommon("todayShort"),
      days7: tCommon("sevenDays"),
      days15: tCommon("fifteenDays"),
      days30: tCommon("thirtyDays"),
      quarters: [
        tGanttRange("q1"),
        tGanttRange("q2"),
        tGanttRange("q3"),
        tGanttRange("q4"),
      ],
    },
  });
  const availabilityState = readAvailabilityPanelState(
    (key) => params[key as keyof typeof params],
    { year, month, featureFilter: feat }
  );

  let data:
    | [
        Awaited<ReturnType<typeof listAllRooms>>,
        Awaited<ReturnType<typeof listBookingsForRange>>,
        Awaited<ReturnType<typeof getPensionSettings>>,
        Awaited<ReturnType<typeof listBuildings>>,
        Awaited<ReturnType<typeof getRoomOccupancy>>,
      ]
    | undefined;

  try {
    data = await Promise.all([
      listAllRooms(),
      listBookingsForRange(viewRange.rangeStart, viewRange.rangeEnd),
      getPensionSettings().catch(() => null),
      listBuildings(),
      getRoomOccupancy(viewRange.rangeStart, viewRange.rangeEnd, {
        referenceDate: effectiveToday,
      }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : t("genericError");
    return (
      <AdminRetroPageFrame title={t("title")}>
        <p className="text-red-600">{msg}</p>
        <p className="mt-2 text-sm">
          {t("loadError")}
        </p>
      </AdminRetroPageFrame>
    );
  }

  if (!data) return null;

  const [
    allRoomsRaw,
    allBookings,
    settings,
    buildingsRaw,
    occupancy,
  ] = data;
  let availabilityDashboard = null;
  let availabilityError: string | null = null;

  if (availabilityState.open) {
    try {
      availabilityDashboard = await loadAvailabilityDashboard(
        availabilityState.year,
        availabilityState.month,
        availabilityState.buildingId,
        availabilityState.featureFilter
      );
    } catch (e) {
      availabilityError = e instanceof Error ? e.message : t("heatmapError");
    }
  }

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

  // Compute today badge counts for the Gantt radial controller
  const todayCereriCount = allBookings.filter(
    (b) => b.status === "cerere_noua"
  ).length;
  const todayArrivalsCount = allBookings.filter(
    (b) =>
      b.check_in === effectiveToday &&
      b.status === "confirmata" &&
      !b.actual_check_in_at
  ).length;
  const todayDeparturesCount = allBookings.filter(
    (b) =>
      b.check_out === effectiveToday &&
      b.status === "confirmata" &&
      !b.actual_check_out_at
  ).length;
  const todayCleanCount = allBookings.filter(
    (b) =>
      b.check_out === effectiveToday &&
      !!b.actual_check_out_at
  ).reduce((sum, b) => sum + (b.room_ids?.length || 1), 0);
  const baseCalendarSearch = toUrlSearchParams(params);
  const prevMonth = availabilityState.month === 0 ? 11 : availabilityState.month - 1;
  const prevYear =
    availabilityState.month === 0 ? availabilityState.year - 1 : availabilityState.year;
  const nextMonth = availabilityState.month === 11 ? 0 : availabilityState.month + 1;
  const nextYear =
    availabilityState.month === 11 ? availabilityState.year + 1 : availabilityState.year;
  const closeAvailabilityHref = hrefForQuery(
    mergeAvailabilityPanelSearch(baseCalendarSearch, { open: false })
  );
  const prevAvailabilityHref = hrefForQuery(
    mergeAvailabilityPanelSearch(baseCalendarSearch, {
      open: true,
      year: prevYear,
      month: prevMonth,
      buildingId: availabilityState.buildingId,
      view: availabilityState.view,
      weekStart: availabilityState.view === "week" ? availabilityState.weekStart : null,
      featureFilter: availabilityState.featureFilter,
      day: null,
    })
  );
  const nextAvailabilityHref = hrefForQuery(
    mergeAvailabilityPanelSearch(baseCalendarSearch, {
      open: true,
      year: nextYear,
      month: nextMonth,
      buildingId: availabilityState.buildingId,
      view: availabilityState.view,
      weekStart: availabilityState.view === "week" ? availabilityState.weekStart : null,
      featureFilter: availabilityState.featureFilter,
      day: null,
    })
  );

  return (
    <AdminRetroPageFrame
      title={t("ganttTitle")}
      description={
        unassignedCereri.length > 0 ? (
          <div className="gantt-page-top-cards">
            <GanttCereriQueue
              cereri={unassignedCereri}
              top
              title={t("unassignedTitle")}
              subtitle={t("unassignedSubtitle")}
              ariaLabel={t("unassignedAria")}
            />
          </div>
        ) : undefined
      }
      className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
    >
      <RetroXpWindow title={t("windowGantt")} className="w-full">
        <GanttCalendarLazy
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
          today={effectiveToday}
          cereriCount={todayCereriCount}
          arrivalsCount={todayArrivalsCount}
          departuresCount={todayDeparturesCount}
          cleanCount={todayCleanCount}
        />
      </RetroXpWindow>
      <GanttAvailabilityHeatmapPanel
        open={availabilityState.open}
        closeHref={closeAvailabilityHref}
        title={availabilityDashboard?.title ?? t("windowGantt")}
        prevHref={prevAvailabilityHref}
        nextHref={nextAvailabilityHref}
        roomCountLabel={
          availabilityDashboard
            ? t("roomCountLabel", {
                count: availabilityDashboard.total_rooms,
                suffix: availabilityState.buildingId ? t("buildingFilterSuffix") : "",
              })
            : t("windowGantt")
        }
      >
        {availabilityError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {availabilityError}
          </p>
        ) : availabilityDashboard ? (
          <AvailabilityDashboard
            dashboard={availabilityDashboard}
            initialDay={availabilityState.day ?? undefined}
            buildingId={availabilityState.buildingId}
            featureFilter={availabilityState.featureFilter}
            view={availabilityState.view}
            weekStart={availabilityState.weekStart}
            basePath="/admin/calendar"
            queryPrefix="avail_"
            extraQueryParams={{ avail: "1" }}
            today={effectiveToday}
          />
        ) : null}
      </GanttAvailabilityHeatmapPanel>
    </AdminRetroPageFrame>
  );
}






