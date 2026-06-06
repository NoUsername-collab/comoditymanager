"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AdminTextActionLink } from "@/components/admin/ui/AdminTextAction";
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { fetchDayAvailabilityDetailAction } from "@/app/[locale]/admin/(panel)/disponibilitate/actions";
import { heatLevelClass, pressureLabel } from "@/domain/availability/heat";
import { minFreeAcrossDays } from "@/domain/availability/compute";
import { mondayOfWeekIso } from "@/domain/availability/week-range";
import { guestInitials } from "@/domain/guest-name";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { todayIso, addDays, parseIso } from "@/lib/stay-dates";
import type {
  AvailabilityDashboard,
  DayAvailability,
  DayAvailabilityDetail,
} from "@/services/availability-month";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import { RoomFeatureBadges } from "@/components/admin/catalog/RoomFeatureBadges";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { AvailabilityLiveSync } from "./AvailabilityLiveSync";
import { AvailabilityWeekendsPanel } from "./AvailabilityWeekendsPanel";

type DisplayMode = "heat" | "free" | "binary";

function AvailabilityHeatLegend({
  displayMode,
  labels,
}: {
  displayMode: DisplayMode;
  labels: {
    modeHeat: string;
    modeFree: string;
    modeBinary: string;
    ariaLabel: string;
    departures: string;
    arrivals: string;
    legendItems: { key: string; className: string; label: string }[];
  };
}) {
  const modeHint =
    displayMode === "heat"
      ? labels.modeHeat
      : displayMode === "free"
        ? labels.modeFree
        : labels.modeBinary;

  return (
    <div className="avail-heat-legend" aria-label={labels.ariaLabel}>
      <span className="avail-heat-legend__mode">{modeHint}</span>
      <div className="avail-heat-legend__items">
        {labels.legendItems.map((item) => (
          <span key={item.key} className="avail-heat-legend__item">
            <span
              className={`avail-heat-legend__swatch ${item.className}`}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>
      <span className="avail-heat-legend__zones">
        <span className="avail-heat-legend__zone avail-heat-legend__zone--out" />
        {labels.departures}
        <span className="avail-heat-legend__zone avail-heat-legend__zone--in" />
        {labels.arrivals}
      </span>
    </div>
  );
}

function HeatDayCell({
  day,
  selected,
  inRange,
  displayMode,
  onSelect,
  labels,
  locale,
  today,
}: {
  day: DayAvailability;
  selected: boolean;
  inRange: boolean;
  displayMode: DisplayMode;
  onSelect: (iso: string, shift: boolean) => void;
  locale: string;
  labels: {
    full: string;
    freeRooms: string;
    departures: string;
    arrivals: string;
    occupancy: string;
    dayCardHint: string;
  };
  today?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverPreview, setHoverPreview] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const isToday = day.iso === (today ?? todayIso());
  const isWeekend = (() => {
    const d = parseIso(day.iso);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  })();
  const heat = heatLevelClass(day.free_rooms, day.total_rooms);
  const outW = Math.max(0.15, Math.min(2, day.checkouts / 3));
  const inW = Math.max(0.15, Math.min(2, day.checkins / 3));

  const label =
    displayMode === "free"
      ? `${day.free_rooms}`
      : displayMode === "heat"
        ? `${day.occupancy_pct}%`
        : day.status === "full"
          ? labels.full
          : `${day.free_rooms}`;

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  return (
    <>
    <button
      ref={btnRef}
      type="button"
      onClick={(e) => onSelect(day.iso, e.shiftKey)}
      onMouseEnter={() => {
        clearHoverTimer();
        hoverTimer.current = setTimeout(() => {
          setAnchorRect(btnRef.current?.getBoundingClientRect() ?? null);
          setHoverPreview(true);
        }, 400);
      }}
      onMouseLeave={() => {
        clearHoverTimer();
        setHoverPreview(false);
      }}
      className={[
        "availability-day-cell avail-heat-cell",
        heat,
        isWeekend && "avail-heat-cell--weekend",
        selected && "avail-heat-cell--selected",
        isToday && !selected && "avail-heat-cell--today",
        inRange && "avail-heat-cell--in-range",
      ]
        .filter(Boolean)
        .join(" ")}
      title={`${formatDateWithDay(day.iso, locale)} · ${day.free_rooms}/${day.total_rooms} ${labels.freeRooms.toLowerCase()} · ${pressureLabel(day.pressure)}`}
    >
      <span className="avail-heat-cell__core">
        <span className="avail-heat-cell__dow">{day.weekday}</span>
        <span className="avail-heat-cell__num">{day.day}</span>
        <span className="avail-heat-cell__metric">{label}</span>
      </span>
      {(day.checkouts > 0 || day.checkins > 0) && (
        <div
          className="avail-heat-cell__ribbon"
          style={
            {
              "--out-w": String(outW),
              "--in-w": String(inW),
            } as React.CSSProperties
          }
          aria-hidden
        >
          <span title={labels.departures} />
          <span />
          <span title={labels.arrivals} />
        </div>
      )}
      {day.unassigned_cereri > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
          !
        </span>
      )}
    </button>
    <AdminFloatingPanel
      open={hoverPreview}
      onClose={() => setHoverPreview(false)}
      anchorRect={anchorRect}
      variant="popover"
      showBackdrop={false}
      closeOnEscape={false}
      width={240}
    >
      <div className="admin-day-preview">
        <strong>{formatDateWithDay(day.iso, locale)}</strong>
        <span>
          {day.free_rooms}/{day.total_rooms} {labels.freeRooms.toLowerCase()} · {day.occupancy_pct}% {labels.occupancy.toLowerCase()}
        </span>
        <span className="mt-1 block text-zinc-600">{pressureLabel(day.pressure)}</span>
        {(day.checkins > 0 || day.checkouts > 0) && (
          <span className="mt-1 block text-zinc-500">
            {day.checkins > 0 && `${day.checkins} ${labels.arrivals.toLowerCase()}`}
            {day.checkins > 0 && day.checkouts > 0 && " · "}
            {day.checkouts > 0 && `${day.checkouts} ${labels.departures.toLowerCase()}`}
          </span>
        )}
        <span className="mt-1.5 block text-[10px] font-semibold text-emerald-700">
          {labels.dayCardHint}
        </span>
      </div>
    </AdminFloatingPanel>
    </>
  );
}

function DayDetailPanel({
  detail,
  year,
  month,
  labels,
}: {
  detail: DayAvailabilityDetail;
  year: number;
  month: number;
  labels: {
    free: string;
    occupied: string;
    rooms: string;
    arrivals: string;
    departures: string;
    unassignedRequest: string;
    unassignedRequestSuffix: string;
    processArrow: string;
    pendingRequestWithRooms: string;
    freeTitle: string;
    addBooking: string;
    requestsPerRoom: string;
    occupiedTitle: string;
    focusGanttWeek: string;
  };
}) {
  const { day, rooms } = detail;
  const free = rooms.filter((r) => r.status === "free");
  const occupied = rooms.filter((r) => r.status === "occupied");
  const cereri = rooms.filter((r) => r.status === "cerere");

  function roomSubtitle(r: (typeof rooms)[number]) {
    return (
      <>
        {r.building_name}
        <RoomFeatureBadges
          roomTypeName={r.room_type_name}
          optionSlugs={r.option_slugs}
          hasAc={r.has_ac}
          compact
        />
      </>
    );
  }

  return (
    <div className="availability-detail-panel--overlay avail-detail flex flex-col">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-3">
        <p className="text-sm font-medium text-emerald-800">
          {pressureLabel(day.pressure)}
        </p>
        <p className="mt-0.5 text-sm text-zinc-600">
          {day.free_rooms} {labels.free.toLowerCase()} · {day.occupied_rooms} {labels.occupied.toLowerCase()} · {day.total_rooms}{" "}
          {labels.rooms.toLowerCase()}
          {day.checkins > 0 && ` · ${day.checkins} ${labels.arrivals.toLowerCase()}`}
          {day.checkouts > 0 && ` · ${day.checkouts} ${labels.departures.toLowerCase()}`}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {detail.unassigned_cereri > 0 && (
          <Link
            href="/admin/bookings"
            className="admin-cereri-glow block rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900 hover:bg-red-100"
          >
            {detail.unassigned_cereri} {labels.unassignedRequest}
            {detail.unassigned_cereri !== 1 ? labels.unassignedRequestSuffix : ""} — {labels.processArrow}
          </Link>
        )}
        {detail.pending_cereri > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            {detail.pending_cereri} {labels.pendingRequestWithRooms}
          </p>
        )}

        {free.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {labels.freeTitle} ({free.length})
            </h3>
            <ul className="mt-2 space-y-1.5">
              {free.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/calendar?y=${year}&m=${month}`}
                    className="avail-room-tile avail-room-tile--free w-full"
                  >
                    <span
                      className="avail-room-tile__dot"
                      style={{ background: r.building_color }}
                    />
                    <span className="min-w-0 flex-1 text-left text-sm font-medium">
                      {r.name}
                      <span className="block text-[10px] text-zinc-500">
                        {roomSubtitle(r)}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      + {labels.addBooking}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cereri.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {labels.requestsPerRoom} ({cereri.length})
            </h3>
            <ul className="mt-2 space-y-1.5">
              {cereri.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.booking_id ? `/admin/bookings/${r.booking_id}` : "/admin/bookings"}
                    className="avail-room-tile avail-room-tile--cerere w-full"
                  >
                    <span
                      className="avail-room-tile__avatar"
                      style={{ background: r.building_color }}
                    >
                      {guestInitials(null, null, r.guest_name)}
                    </span>
                    <span className="min-w-0 flex-1 text-left text-sm">
                      {r.name} · {r.guest_name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {occupied.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              {labels.occupiedTitle} ({occupied.length})
            </h3>
            <ul className="mt-2 space-y-1.5">
              {occupied.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.booking_id ? `/admin/bookings/${r.booking_id}` : "#"}
                    className="avail-room-tile avail-room-tile--occupied w-full"
                  >
                    <span
                      className="avail-room-tile__avatar"
                      style={{ background: r.building_color }}
                    >
                      {guestInitials(null, null, r.guest_name)}
                    </span>
                    <span className="min-w-0 flex-1 text-left text-sm font-medium">
                      {r.name}
                      <span className="block text-xs text-zinc-500">{r.guest_name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-zinc-100 px-5 py-3">
        <AdminTextActionLink
          href={`/admin/calendar?y=${day.iso.slice(0, 4)}&m=${Number(day.iso.slice(5, 7)) - 1}&ws=${mondayOfWeekIso(day.iso)}`}
          variant="primary"
          className="text-sm"
        >
          {labels.focusGanttWeek} →
        </AdminTextActionLink>
      </div>
    </div>
  );
}

export function AvailabilityDashboard({
  dashboard: initial,
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
  const [dashboard] = useState(initial);
  const [selectedIso, setSelectedIso] = useState<string | null>(initialDay ?? null);
  const [detail, setDetail] = useState<DayAvailabilityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("heat");
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [kpiHelp, setKpiHelp] = useState<string | null>(null);
  const weekHeaders = [
    tAvail("weekdayMon"),
    tAvail("weekdayTue"),
    tAvail("weekdayWed"),
    tAvail("weekdayThu"),
    tAvail("weekdayFri"),
    tAvail("weekdaySat"),
    tAvail("weekdaySun"),
  ];
  const kpiHelpMap: Record<string, { title: string; body: string }> = {
    relaxed: { title: tAvail("kpiRelaxedTitle"), body: tAvail("kpiRelaxedBody") },
    full: { title: tAvail("kpiFullTitle"), body: tAvail("kpiFullBody") },
    min: { title: tAvail("kpiMinTitle"), body: tAvail("kpiMinBody") },
    cereri: { title: tAvail("kpiRequestsTitle"), body: tAvail("kpiRequestsBody") },
  };
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

  const selectDay = useCallback(
    async (iso: string) => {
      setSelectedIso(iso);
      setLoading(true);
      try {
        const result = await fetchDayAvailabilityDetailAction(
          iso,
          buildingId,
          featureFilter
        );
        if (result.ok) {
          setDetail(result.data);
          pushParams({ day: iso });
        } else {
          // Silently ignore auth/network errors — don't crash the whole app
          console.warn("[availability] load failed:", result.error);
          setDetail(null);
        }
      } catch {
        // Server action transport error — swallow it
        setDetail(null);
      } finally {
        setLoading(false);
      }
    },
    [buildingId, featureFilter, pushParams]
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

  // Restore selected day from URL on initial mount only.
  // Must NOT re-run when selectDay changes (it depends on pushParams
  // which recreates on every render → would cause infinite loop).
  const initialDayRef = useRef(initialDay);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return; // only on first mount
    mountedRef.current = true;
    const day = initialDayRef.current;
    if (!day) return;
    const frame = window.requestAnimationFrame(() => {
      void selectDay(day);
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const { kpis } = dashboard;

  return (
    <div className="avail-dashboard space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="avail-kpi-strip">
        {(
          [
            ["relaxed", kpis.days_relaxed, tAvail("kpiRelaxedLabel"), "avail-kpi-card--good"],
            ["full", kpis.days_full, tAvail("kpiFullLabel"), ""],
            [
              "min",
              kpis.min_free_rooms,
              tAvail("kpiMinLabel"),
              "",
              kpis.min_free_day_iso
                ? tAvail("onDate", { date: new Date(kpis.min_free_day_iso).toLocaleDateString(locale) })
                : undefined,
            ],
            [
              "cereri",
              kpis.unassigned_nights,
              tAvail("kpiUnassignedNightsLabel"),
              kpis.unassigned_nights > 0 ? "avail-kpi-card--alert" : "",
            ],
          ] as const
        ).map(([key, value, label, extra, sub]) => (
          <button
            key={key}
            type="button"
            className={["avail-kpi-card text-left", extra].filter(Boolean).join(" ")}
            onClick={() => setKpiHelp(key)}
            title={tAvail("clickForExplanation")}
          >
            <p className="avail-kpi-card__value">{value}</p>
            <p className="avail-kpi-card__label">
              {label}
              {sub && (
                <span className="block font-normal normal-case text-zinc-500">
                  {sub}
                </span>
              )}
            </p>
          </button>
        ))}
      </div>

      {kpis.vs_prev_full_delta !== 0 && (
        <p className="text-xs text-zinc-600">
          {tAvail("vsLastMonth")}:{" "}
          <strong
            className={
              kpis.vs_prev_full_delta > 0 ? "text-rose-700" : "text-emerald-700"
            }
          >
            {kpis.vs_prev_full_delta > 0 ? "+" : ""}
            {kpis.vs_prev_full_delta} {tAvail("fullDays")}
          </strong>
        </p>
      )}

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
          style={{ "--chip-color": "#64748b" } as React.CSSProperties}
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
            style={{ "--chip-color": "#94a3b8" } as React.CSSProperties}
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
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={copyIntervalText}
            >
              {tAvail("copyForClient")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
              }}
            >
              {tAvail("clearInterval")}
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-500">
        {tAvail("shiftClickHint")}
      </p>

      <RetroXpWindow title={`${tCommon("availability")} — ${dashboard.title}`}>
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
                        labels={heatCellLabels}
                        locale={locale}
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
                  className="text-xs font-semibold text-emerald-700"
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
                  className="text-xs font-semibold text-emerald-700"
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

        {loading && selectedIso && (
          <p className="mt-3 text-center text-sm text-zinc-500">{tAvail("loadingDayCard")}</p>
        )}
      </div>
      </RetroXpWindow>

      <AdminFloatingPanel
        open={!!detail && !loading}
        onClose={() => {
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
          detail
            ? `${tAvail("dayCard")} — ${formatDateWithDay(detail.day.iso, locale, true)}`
            : undefined
        }
        variant="modal"
        width={520}
      >
        {detail && (
          <DayDetailPanel
            detail={detail}
            year={dashboard.year}
            month={dashboard.month}
            labels={{
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
            }}
          />
        )}
      </AdminFloatingPanel>

      <AdminFloatingPanel
        open={!!kpiHelp && !!kpiHelpMap[kpiHelp]}
        onClose={() => setKpiHelp(null)}
        title={kpiHelp ? kpiHelpMap[kpiHelp].title : undefined}
        variant="modal"
        width={400}
      >
        {kpiHelp && (
          <p className="admin-alert-dialog__message">{kpiHelpMap[kpiHelp].body}</p>
        )}
      </AdminFloatingPanel>
    </div>
  );
}
