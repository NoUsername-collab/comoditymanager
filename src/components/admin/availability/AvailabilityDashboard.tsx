"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { fetchDayAvailabilityDetailAction } from "@/app/[locale]/admin/(panel)/disponibilitate/actions";
import { minFreeAcrossDays } from "@/domain/availability/compute";
import { mondayOfWeekIso } from "@/domain/availability/week-range";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { todayIso, addDays } from "@/lib/stay-dates";
import type {
  AvailabilityDashboard,
  DayAvailabilityDetail,
} from "@/services/availability-month";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { AvailabilityLiveSync } from "./AvailabilityLiveSync";
import { AvailabilityWeekendsPanel } from "./AvailabilityWeekendsPanel";
import {
  AvailabilityHeatLegend,
  HeatDayCell,
  type AvailabilityDisplayMode,
} from "./AvailabilityHeatCells";
import { AvailabilityKpiStrip } from "./AvailabilityKpiStrip";
import {
  DayDetailPanelError,
  DayDetailPanelSkeleton,
} from "./AvailabilityDayDetailPanel";

const DayDetailPanel = dynamic(
  () =>
    import("./AvailabilityDayDetailPanel").then((m) => ({
      default: m.DayDetailPanel,
    })),
  { ssr: false }
);

export function AvailabilityDashboard({
  dashboard,
  initialDay,
  buildingId: initialBuildingId,
  featureFilter: initialFeatureFilter = "all",
  view: initialView,
  weekStart: initialWeekStart,
  basePath = "/admin/disponibilitate",
  anchorHash = "",
  queryPrefix = "",
  extraQueryParams = {},
  today: todayProp,
}: {
  dashboard: AvailabilityDashboard;
  initialDay?: string;
  buildingId: string | null;
  featureFilter?: GanttFeatureFilter;
  view: "month" | "week";
  weekStart: string | null;
  basePath?: string;
  anchorHash?: string;
  queryPrefix?: string;
  extraQueryParams?: Record<string, string | undefined>;
  today?: string;
}) {
  const effectiveToday = todayProp ?? todayIso();
  const tCommon = useTranslations("admin.common");
  const tAvail = useTranslations("admin.availabilityDashboard");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIso, setSelectedIso] = useState<string | null>(initialDay ?? null);
  const [detail, setDetail] = useState<DayAvailabilityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [displayMode, setDisplayMode] = useState<AvailabilityDisplayMode>("heat");
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const weekHeaders = [
    tAvail("weekdayMon"),
    tAvail("weekdayTue"),
    tAvail("weekdayWed"),
    tAvail("weekdayThu"),
    tAvail("weekdayFri"),
    tAvail("weekdaySat"),
    tAvail("weekdaySun"),
  ];
  const heatLegendLabels = {
    modeHeat: tAvail("metricOccupancyPct"),
    modeFree: tAvail("metricFreeRooms"),
    modeBinary: tAvail("metricBinary"),
    ariaLabel: tAvail("availabilityColorLegend"),
    departures: tCommon("departuresLabel"),
    arrivals: tCommon("arrivals"),
    legendItems: [
      { key: "relaxed", className: "avail-heat-cell--relaxed", label: tAvail("relaxed") },
      { key: "moderate", className: "avail-heat-cell--moderate", label: tAvail("moderate") },
      { key: "tight", className: "avail-heat-cell--tight", label: tAvail("tight") },
      { key: "full", className: "avail-heat-cell--full", label: tCommon("full") },
    ],
  };
  const heatCellLabels = {
    full: tCommon("full"),
    freeRooms: tAvail("freeRooms"),
    departures: tCommon("departuresLabel"),
    arrivals: tCommon("arrivals"),
    occupancy: tCommon("occupancy"),
    dayCardHint: tAvail("clickForDayCard"),
  };

  const buildingId = initialBuildingId;
  const featureFilter = initialFeatureFilter;
  const view = initialView;

  const weekendAccentColor = useMemo(() => {
    if (!buildingId) return null;
    return (
      dashboard.buildings.find((b) => b.id === buildingId)?.display_color ?? null
    );
  }, [buildingId, dashboard.buildings]);

  const weekendSlots = useMemo(() => {
    const picks = dashboard.weekend_picks.slice(0, 4);
    if (picks.length > 0) return picks;
    return dashboard.next_weekend ? [dashboard.next_weekend] : [];
  }, [dashboard.weekend_picks, dashboard.next_weekend]);
  const weekMonday =
    initialWeekStart ?? mondayOfWeekIso(selectedIso ?? effectiveToday);

  const prefixedKey = useCallback(
    (key: string) => (queryPrefix ? `${queryPrefix}${key}` : key),
    [queryPrefix]
  );

  const buildQuery = useCallback(
    (year: number, month: number, extra: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      const nextValues: Record<string, string | undefined> = {
        [prefixedKey("y")]: String(year),
        [prefixedKey("m")]: String(month),
        [prefixedKey("day")]: extra.day,
        [prefixedKey("building")]: extra.building,
        [prefixedKey("feat")]: extra.feat,
        [prefixedKey("view")]: extra.view,
        [prefixedKey("ws")]: extra.ws,
      };

      for (const [key, value] of Object.entries(nextValues)) {
        if (value) p.set(key, value);
        else p.delete(key);
      }

      for (const [key, value] of Object.entries(extraQueryParams)) {
        if (value) p.set(key, value);
        else p.delete(key);
      }

      return p.toString();
    },
    [searchParams, prefixedKey, extraQueryParams]
  );

  const buildTargetHref = useCallback(
    (query: string) => `${basePath}?${query}${anchorHash}`,
    [anchorHash, basePath]
  );

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const q = buildQuery(dashboard.year, dashboard.month, {
        day: patch.day ?? searchParams.get(prefixedKey("day")) ?? undefined,
        building: patch.building ?? buildingId ?? undefined,
        feat: patch.feat ?? (featureFilter !== "all" ? featureFilter : undefined),
        view: patch.view ?? view,
        ws: patch.ws ?? (view === "week" ? weekMonday : undefined),
      });
      router.push(buildTargetHref(q));
    },
    [
      router,
      dashboard.year,
      dashboard.month,
      searchParams,
      buildingId,
      featureFilter,
      view,
      weekMonday,
      prefixedKey,
      buildQuery,
      buildTargetHref,
    ]
  );

  const requestIdRef = useRef(0);

  const prefetchDayDetail = useCallback(
    (iso: string) => {
      const knownDay =
        dashboard.days.find((d) => d.iso === iso) ??
        dashboard.scan_days.find((d) => d.iso === iso) ??
        null;
      void fetchDayAvailabilityDetailAction(
        iso,
        buildingId,
        featureFilter,
        knownDay
      );
    },
    [buildingId, dashboard.days, dashboard.scan_days, featureFilter]
  );

  const selectDay = useCallback(
    async (iso: string) => {
      setSelectedIso(iso);
      setDetail(null);
      setLoadError(false);
      setLoading(true);

      const thisRequest = ++requestIdRef.current;

      try {
        const knownDay =
          dashboard.days.find((d) => d.iso === iso) ??
          dashboard.scan_days.find((d) => d.iso === iso) ??
          null;
        const data = await fetchDayAvailabilityDetailAction(
          iso,
          buildingId,
          featureFilter,
          knownDay
        );
        if (thisRequest !== requestIdRef.current) return;
        if (!data) {
          setDetail(null);
          setLoadError(true);
          return;
        }
        setDetail(data);
      } catch {
        if (thisRequest !== requestIdRef.current) return;
        setDetail(null);
        setLoadError(true);
      } finally {
        if (thisRequest === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [buildingId, dashboard.days, dashboard.scan_days, featureFilter]
  );

  const handleDayClick = (iso: string, shift: boolean) => {
    if (shift) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(iso);
        setRangeEnd(null);
      } else {
        setRangeEnd(iso);
      }
    } else {
      selectDay(iso);
    }
  };

  const initialDayLoaded = useRef(false);
  useEffect(() => {
    if (initialDayLoaded.current || !initialDay) return;
    initialDayLoaded.current = true;
    void selectDay(initialDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDay]);

  const rangeDays = useMemo(() => {
    if (!rangeStart) return [];
    const end = rangeEnd ?? rangeStart;
    const [a, b] = rangeStart <= end ? [rangeStart, end] : [end, rangeStart];
    return dashboard.days.filter((d) => d.iso >= a && d.iso <= b);
  }, [rangeStart, rangeEnd, dashboard.days]);

  const rangeStats = useMemo(
    () => minFreeAcrossDays(rangeDays),
    [rangeDays]
  );

  const monthCells = useMemo(() => {
    const blanks = Array.from({ length: dashboard.leading_blanks }, (_, i) => ({
      type: "blank" as const,
      key: `b-${i}`,
    }));
    const dayCells = dashboard.days.map((d) => ({
      type: "day" as const,
      key: d.iso,
      day: d,
    }));
    return [...blanks, ...dayCells];
  }, [dashboard]);

  const weekSlots = useMemo(() => {
    const pool =
      dashboard.scan_days.length > 0 ? dashboard.scan_days : dashboard.days;
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDays(weekMonday, i);
      return pool.find((d) => d.iso === iso) ?? null;
    });
  }, [weekMonday, dashboard.scan_days, dashboard.days]);

  const selectedKnownDay = useMemo(() => {
    if (!selectedIso) return null;
    return (
      dashboard.days.find((d) => d.iso === selectedIso) ??
      dashboard.scan_days.find((d) => d.iso === selectedIso) ??
      null
    );
  }, [selectedIso, dashboard.days, dashboard.scan_days]);

  const dayDetailLabels = useMemo(
    () => ({
      free: tCommon("free"),
      occupied: tCommon("occupied"),
      rooms: tCommon("rooms"),
      arrivals: tCommon("arrivals"),
      departures: tCommon("departuresLabel"),
      unassignedRequest: tAvail("unassignedRequest"),
      unassignedRequestSuffix: tAvail("unassignedRequestSuffix"),
      processArrow: tAvail("processArrow"),
      pendingRequestWithRooms: tAvail("pendingRequestWithRooms"),
      freeTitle: tAvail("freeTitle"),
      addBooking: tAvail("addBooking"),
      requestsPerRoom: tAvail("requestsPerRoom"),
      occupiedTitle: tAvail("occupiedTitle"),
      focusGanttWeek: tAvail("focusGanttWeek"),
    }),
    [tCommon, tAvail]
  );

  const inRange = (iso: string) => {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    const [a, b] = rangeStart <= end ? [rangeStart, end] : [end, rangeStart];
    return iso >= a && iso <= b;
  };

  const copyIntervalText = () => {
    if (rangeDays.length === 0) return;
    const [a, b] = rangeStart && rangeEnd
      ? rangeStart <= rangeEnd
        ? [rangeStart, rangeEnd]
        : [rangeEnd, rangeStart]
      : [rangeStart!, rangeStart!];
    const text = `${tAvail("clipboardPrefix")}: ${formatDateWithDay(a!, locale)} – ${formatDateWithDay(b!, locale)} · ${tCommon("min")} ${rangeStats.min} ${tAvail("freeRooms").toLowerCase()} / ${tCommon("night")}`;
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="avail-dashboard space-y-4">
      <div className="avail-dashboard-toolbar flex flex-wrap items-center justify-between gap-3">
        <AvailabilityLiveSync />
        <div className="avail-display-mode">
          {(
            [
              ["heat", tAvail("metricOccupancyPct")],
              ["free", tAvail("freeRooms")],
              ["binary", tAvail("metricBinary")],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={displayMode === mode}
              onClick={() => setDisplayMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="avail-view-tabs">
          <button
            type="button"
            className={[
              "avail-view-tab",
              view === "month" && "avail-view-tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => pushParams({ view: "month", ws: undefined })}
          >
            {tCommon("month")}
          </button>
          <button
            type="button"
            className={[
              "avail-view-tab",
              view === "week" && "avail-view-tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              pushParams({
                view: "week",
                ws: weekMonday,
              })
            }
          >
            {tCommon("sevenDays")}
          </button>
        </div>
      </div>

      <AvailabilityKpiStrip kpis={dashboard.kpis} />

      <AvailabilityWeekendsPanel
        weekends={weekendSlots}
        nextSaturdayIso={dashboard.next_weekend?.saturday_iso ?? null}
        accentColor={weekendAccentColor}
        onSelect={(iso) => void selectDay(iso)}
      />

      <div className="avail-building-chips">
        <button
          type="button"
          className={[
            "avail-building-chip",
            !buildingId && "avail-building-chip--active",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ "--chip-color": "var(--text-muted)" } as React.CSSProperties}
          onClick={() =>
            router.push(
                buildTargetHref(
                  buildQuery(dashboard.year, dashboard.month, {
                    view,
                    day: selectedIso ?? undefined,
                  })
                )
            )
          }
        >
          {tCommon("all")} · {dashboard.total_rooms}
        </button>
        {dashboard.buildings.map((b) => (
          <button
            key={b.id}
            type="button"
            className={[
              "avail-building-chip",
              buildingId === b.id && "avail-building-chip--active",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--chip-color": b.display_color } as React.CSSProperties}
            onClick={() =>
              router.push(
                buildTargetHref(
                  buildQuery(dashboard.year, dashboard.month, {
                    building: b.id,
                    view,
                    day: selectedIso ?? undefined,
                    ws: view === "week" ? weekMonday : undefined,
                  })
                )
              )
            }
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: b.display_color }}
            />
            {b.name} ({b.room_count})
          </button>
        ))}
      </div>

      <div className="avail-building-chips mt-2">
        {(
          [
            { value: "all" as const, label: tAvail("allOptions") },
            { value: "ac" as const, label: tAvail("withAc") },
            { value: "fridge" as const, label: tCommon("withFridge") },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              "avail-building-chip",
              featureFilter === opt.value && "avail-building-chip--active",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--chip-color": "var(--text-faint)" } as React.CSSProperties}
            onClick={() =>
              pushParams({
                feat: opt.value === "all" ? undefined : opt.value,
              })
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {rangeDays.length > 0 && (
        <div className="avail-interval-bar flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-800">
            {tCommon("interval")} {formatDateWithDay(rangeDays[0]!.iso, locale)} →{" "}
            {formatDateWithDay(rangeDays[rangeDays.length - 1]!.iso, locale)} · minim{" "}
            <strong>{rangeStats.min}</strong> {tAvail("freeRooms").toLowerCase()} / {tCommon("night")}
          </p>
          <div className="avail-interval-bar__actions flex gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              className="avail-interval-bar__copy"
              onClick={copyIntervalText}
            >
              {tAvail("copyForClient")}
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              className="avail-interval-bar__clear"
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
              }}
            >
              {tAvail("clearInterval")}
            </AdminButton>
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-500">
        {tAvail("shiftClickHint")}
      </p>

      <AdminPanel title={`${tCommon("availability")} — ${dashboard.title}`}>
      <div className="availability-layout">
        <div className="availability-grid-panel min-w-0">
          {view === "month" ? (
            <>
              <div className="availability-month-matrix">
                <div className="availability-month-grid availability-month-grid--calendar">
                  {weekHeaders.map((h) => (
                    <div key={h} className="availability-month-header">
                      {h}
                    </div>
                  ))}
                  {monthCells.map((cell) =>
                    cell.type === "blank" ? (
                      <div
                        key={cell.key}
                        className="availability-month-blank"
                        aria-hidden
                      />
                    ) : (
                      <div key={cell.key} className="availability-day-cell-slot">
                        <HeatDayCell
                          day={cell.day}
                          selected={selectedIso === cell.day.iso}
                          inRange={inRange(cell.day.iso)}
                          displayMode={displayMode}
                          onSelect={handleDayClick}
                          onDayHover={prefetchDayDetail}
                          labels={heatCellLabels}
                          locale={locale}
                          today={effectiveToday}
                        />
                      </div>
                    )
                  )}
                </div>

                <AvailabilityHeatLegend displayMode={displayMode} labels={heatLegendLabels} />
              </div>
            </>
          ) : (
            <div className="availability-week-matrix">
              <div className="availability-month-grid availability-month-grid--calendar">
                {weekHeaders.map((h) => (
                  <div key={`w-${h}`} className="availability-month-header">
                    {h}
                  </div>
                ))}
              {weekSlots.every((d) => d === null) ? (
                <p className="availability-week-empty">
                  {tAvail("navigateToWeekMonth")}
                </p>
              ) : (
                weekSlots.map((d, i) => {
                  const iso = addDays(weekMonday, i);
                  if (!d) {
                    return (
                      <div
                        key={iso}
                        className="availability-day-cell-slot availability-day-cell-slot--week availability-day-cell-slot--empty"
                        aria-hidden
                      />
                    );
                  }
                  return (
                    <div
                      key={d.iso}
                      className="availability-day-cell-slot availability-day-cell-slot--week"
                    >
                      <HeatDayCell
                        day={d}
                        selected={selectedIso === d.iso}
                        inRange={inRange(d.iso)}
                        displayMode={displayMode}
                        onSelect={handleDayClick}
                        onDayHover={prefetchDayDetail}
                        labels={heatCellLabels}
                        locale={locale}
                        today={effectiveToday}
                      />
                    </div>
                  );
                })
              )}
              </div>
              <AvailabilityHeatLegend displayMode={displayMode} labels={heatLegendLabels} />
              <div className="availability-week-nav">
                <button
                  type="button"
                  className="availability-week-nav__prev text-xs font-semibold text-emerald-700"
                  onClick={() =>
                    pushParams({
                      view: "week",
                      ws: addDays(weekMonday, -7),
                    })
                  }
                >
                  ← {tAvail("previousWeek")}
                </button>
                <button
                  type="button"
                  className="availability-week-nav__next text-xs font-semibold text-emerald-700"
                  onClick={() =>
                    pushParams({
                      view: "week",
                      ws: addDays(weekMonday, 7),
                    })
                  }
                >
                  {tAvail("nextWeek")} →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      </AdminPanel>

      <AdminFloatingPanel
        open={!!selectedIso}
        onClose={() => {
          requestIdRef.current++;
          setLoading(false);
          setLoadError(false);
          setDetail(null);
          setSelectedIso(null);
          const q = buildQuery(dashboard.year, dashboard.month, {
            building: buildingId ?? undefined,
            view,
            ws: view === "week" ? weekMonday : undefined,
          });
          router.push(buildTargetHref(q));
        }}
        title={
          selectedIso
            ? `${tAvail("dayCard")} — ${formatDateWithDay(selectedIso, locale, true)}`
            : undefined
        }
        variant="modal"
        width={520}
      >
        {loadError && !loading ? (
          <DayDetailPanelError
            message={tAvail("dayCardLoadError")}
            retryLabel={tAvail("dayCardRetry")}
            onRetry={() => selectedIso && void selectDay(selectedIso)}
          />
        ) : loading && !detail ? (
          <DayDetailPanelSkeleton
            knownDay={selectedKnownDay}
            loadingLabel={tAvail("loadingDayCard")}
            labels={dayDetailLabels}
          />
        ) : detail ? (
          <DayDetailPanel
            detail={detail}
            year={dashboard.year}
            month={dashboard.month}
            labels={dayDetailLabels}
          />
        ) : null}
      </AdminFloatingPanel>
    </div>
  );
}
