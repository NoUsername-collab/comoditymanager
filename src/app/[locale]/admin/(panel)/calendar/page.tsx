import { Suspense } from "react";
import { CalendarAvailabilityStream } from "@/components/admin/calendar/CalendarAvailabilityStream";
import { AdminAvailabilitySkeleton } from "@/components/admin/loading/AdminAvailabilitySkeleton";
import { GanttCalendarLazy } from "@/components/admin/GanttCalendarLazy";
import { GanttAvailabilityHeatmapPanelLazy } from "@/components/admin/gantt/GanttAvailabilityHeatmapPanelLazy";
import { GanttCereriQueueLazy } from "@/components/admin/gantt/GanttCereriQueueLazy";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import type { GanttViewMode } from "@/components/admin/gantt/GanttToolbar";
import { readAvailabilityPanelState, mergeAvailabilityPanelSearch } from "@/lib/availability-panel-query";
import { resolveGanttRange } from "@/domain/gantt/view-range";
import { loadCalendarCoreData } from "@/services/calendar-page-data";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { parseGanttFilter, parseGanttFeatureFilter } from "@/lib/gantt-query";
import { filterGanttRoomsByFeature } from "@/domain/gantt/filters";
import { sortRoomsLikeLocationStructure } from "@/domain/room/display-order";
import { parseGanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import { getLocale, getTranslations } from "next-intl/server";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { resolvePostCheckoutEditPolicy } from "@/services/bookings/post-checkout-guard";
import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinSettings,
} from "@/services/checkin/settings";
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
  const paramsPromise = searchParams;
  const todayPromise = getEffectiveToday();
  const localePromise = getLocale();

  const checkinSettingsPromise = getCheckinSettings().catch(
    () => DEFAULT_CHECKIN_SETTINGS,
  );

  const [t, tCommon, tGanttRange, locale, params, effectiveToday, dataResult, postCheckoutPolicy, checkinSettings] =
    await Promise.all([
      getTranslations("admin.pages.calendar"),
      getTranslations("admin.common"),
      getTranslations("admin.gantt.range"),
      localePromise,
      paramsPromise,
      todayPromise,
      Promise.all([paramsPromise, todayPromise, localePromise])
        .then(([p, today, loc]) => {
          const ref = parseIso(today);
          const y = Number(p.y) || ref.getFullYear();
          const m = p.m !== undefined ? Number(p.m) : ref.getMonth();
          const q = p.q !== undefined ? Number(p.q) : Math.floor(m / 3);
          const previewRange = resolveGanttRange({
            y,
            m,
            zoom: p.zoom,
            ws: p.ws,
            q,
            locale: loc,
            today,
          });
          return loadCalendarCoreData(
            previewRange.rangeStart,
            previewRange.rangeEnd,
            today
          );
        })
        .then((data) => ({ ok: true as const, data }))
        .catch((error) => ({ ok: false as const, error })),
      resolvePostCheckoutEditPolicy().catch(() => ({
        memberRole: null,
        allowPostCheckoutEdits: false,
        canEditAfterCheckout: false,
      })),
      checkinSettingsPromise,
    ]);
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

  if (!dataResult.ok) {
    const msg =
      dataResult.error instanceof Error
        ? dataResult.error.message
        : t("genericError");
    return (
      <AdminPageFrame title={t("title")}>
        <p className="text-red-600">{msg}</p>
        <p className="mt-2 text-sm">{t("loadError")}</p>
      </AdminPageFrame>
    );
  }

  const data = dataResult.data;
  if (!data) return null;

  const [
    allRoomsRaw,
    allBookings,
    settings,
    buildingsRaw,
    allFloors,
    occupancy,
    optionSlugsByRoom,
  ] = data;
  const activeBuildings = buildingsRaw.filter((b) => b.is_active);
  const allRooms = allRoomsRaw.filter((r) => r.is_active);
  const checkInTime =
    settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
  const checkOutTime =
    settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

  const departurePolicy = {
    earlyCheckoutAllowed: checkinSettings.early_checkout_allowed,
    earlyCheckoutFee: checkinSettings.early_checkout_fee,
    checkoutTimeUntil: checkinSettings.checkout_time_until ?? checkOutTime,
  };

  const buildingById = new Map(activeBuildings.map((b) => [b.id, b]));

  const ganttRoomsAll = sortRoomsLikeLocationStructure(
    allRooms.map((r) => {
      const building = buildingById.get(r.building_id);
      return {
        id: r.id,
        name: r.name,
        building_id: r.building_id,
        floor_id: r.floor_id,
        sort_order: r.sort_order,
        building_name: r.building_name,
        building_color: building?.color_hex ?? null,
        building_ac_mode: building?.ac_mode ?? "per_room",
        has_ac: r.has_ac,
        room_type_name: r.room_type_name,
        option_slugs: optionSlugsByRoom[r.id] ?? [],
      };
    }),
    activeBuildings,
    allFloors
  ).map(({ floor_id: _floorId, sort_order: _sortOrder, ...room }) => room);

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
    <AdminPageFrame
      title={t("ganttTitle")}
      description={
        unassignedCereri.length > 0 ? (
          <div className="gantt-page-top-cards">
            <GanttCereriQueueLazy
              cereri={unassignedCereri}
              top
              title={t("unassignedTitle")}
              subtitle={t("unassignedSubtitle")}
              ariaLabel={t("unassignedAria")}
            />
          </div>
        ) : undefined
      }
      className="gantt-calendar-page w-full max-w-none"
    >
      <AdminPanel
        title={t("windowGantt")}
        className="w-full"
        controlTitles={{
          minimize: tCommon("minimize"),
          maximize: tCommon("maximize"),
          close: tCommon("close"),
        }}
      >
        <GanttCalendarLazy
          viewRange={viewRange}
          rooms={ganttRooms}
          bookings={allBookings}
          occupancy={occupancy}
          groupByBuilding={view === "all"}
          buildings={activeBuildings.map((building) => ({
            id: building.id,
            sort_order: building.sort_order,
          }))}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          departurePolicy={departurePolicy}
          filter={filter}
          featureFilter={feat}
          layerFilter={layer}
          focusDay={focusDay}
          today={effectiveToday}
          canEditAfterCheckout={postCheckoutPolicy.canEditAfterCheckout}
          cereriCount={todayCereriCount}
          arrivalsCount={todayArrivalsCount}
          departuresCount={todayDeparturesCount}
          cleanCount={todayCleanCount}
        />
      </AdminPanel>
      <GanttAvailabilityHeatmapPanelLazy
        open={availabilityState.open}
        closeHref={closeAvailabilityHref}
        title={t("windowGantt")}
        prevHref={prevAvailabilityHref}
        nextHref={nextAvailabilityHref}
        roomCountLabel={t("windowGantt")}
      >
        {availabilityState.open ? (
          <Suspense fallback={<AdminAvailabilitySkeleton />}>
            <CalendarAvailabilityStream
              year={availabilityState.year}
              month={availabilityState.month}
              buildingId={availabilityState.buildingId}
              featureFilter={availabilityState.featureFilter}
              view={availabilityState.view}
              weekStart={availabilityState.weekStart}
              initialDay={availabilityState.day ?? undefined}
              today={effectiveToday}
            />
          </Suspense>
        ) : null}
      </GanttAvailabilityHeatmapPanelLazy>
    </AdminPageFrame>
  );
}






