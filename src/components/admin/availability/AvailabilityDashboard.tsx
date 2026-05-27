"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchDayAvailabilityDetailAction } from "@/app/admin/(panel)/disponibilitate/actions";
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

const WEEK_HEADERS = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"];

const KPI_HELP: Record<string, { title: string; body: string }> = {
  relaxed: {
    title: "Zile relaxate",
    body: "Număr de zile în lună cu cel puțin 3 camere libere simultan — presiune redusă, ușor de vândut last-minute.",
  },
  full: {
    title: "Zile pline",
    body: "Zile în care toate camerele active sunt ocupate sau blocate — nu mai ai capacitate disponibilă.",
  },
  min: {
    title: "Minim libere",
    body: "Cea mai strânsă zi din lună: minimul de camere libere într-o singură noapte. Data apare sub etichetă.",
  },
  cereri: {
    title: "Cereri nealocate",
    body: "Total nopți din lună cu cereri fără cameră alocată — necesită procesare în lista de rezervări.",
  },
};

type DisplayMode = "heat" | "free" | "binary";

const HEAT_LEGEND: { key: string; className: string; label: string }[] = [
  { key: "relaxed", className: "avail-heat-cell--relaxed", label: "Relaxat" },
  { key: "moderate", className: "avail-heat-cell--moderate", label: "Moderat" },
  { key: "tight", className: "avail-heat-cell--tight", label: "Strâns" },
  { key: "full", className: "avail-heat-cell--full", label: "Plin" },
];

function AvailabilityHeatLegend({ displayMode }: { displayMode: DisplayMode }) {
  const modeHint =
    displayMode === "heat"
      ? "Cifră = % ocupare"
      : displayMode === "free"
        ? "Cifră = camere libere"
        : "Plin / liber";

  return (
    <div className="avail-heat-legend" aria-label="Legendă culori disponibilitate">
      <span className="avail-heat-legend__mode">{modeHint}</span>
      <div className="avail-heat-legend__items">
        {HEAT_LEGEND.map((item) => (
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
        plecări
        <span className="avail-heat-legend__zone avail-heat-legend__zone--in" />
        sosiri
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
}: {
  day: DayAvailability;
  selected: boolean;
  inRange: boolean;
  displayMode: DisplayMode;
  onSelect: (iso: string, shift: boolean) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverPreview, setHoverPreview] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const isToday = day.iso === todayIso();
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
          ? "Plin"
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
      title={`${formatDateWithDay(day.iso)} · ${day.free_rooms}/${day.total_rooms} libere · ${pressureLabel(day.pressure)}`}
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
          <span title="Plecări" />
          <span />
          <span title="Sosiri" />
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
        <strong>{formatDateWithDay(day.iso)}</strong>
        <span>
          {day.free_rooms}/{day.total_rooms} libere · {day.occupancy_pct}% ocupare
        </span>
        <span className="mt-1 block text-zinc-600">{pressureLabel(day.pressure)}</span>
        {(day.checkins > 0 || day.checkouts > 0) && (
          <span className="mt-1 block text-zinc-500">
            {day.checkins > 0 && `${day.checkins} sosiri`}
            {day.checkins > 0 && day.checkouts > 0 && " · "}
            {day.checkouts > 0 && `${day.checkouts} plecări`}
          </span>
        )}
        <span className="mt-1.5 block text-[10px] font-semibold text-emerald-700">
          Click = carte de zi completă
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
}: {
  detail: DayAvailabilityDetail;
  year: number;
  month: number;
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
          {day.free_rooms} libere · {day.occupied_rooms} ocupate · {day.total_rooms}{" "}
          camere
          {day.checkins > 0 && ` · ${day.checkins} sosiri`}
          {day.checkouts > 0 && ` · ${day.checkouts} plecări`}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {detail.unassigned_cereri > 0 && (
          <Link
            href="/admin/bookings"
            className="admin-cereri-glow block rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900 hover:bg-red-100"
          >
            {detail.unassigned_cereri} cerere
            {detail.unassigned_cereri !== 1 ? "i" : ""} nealocată
            {detail.unassigned_cereri !== 1 ? "" : "ă"} — procesează →
          </Link>
        )}
        {detail.pending_cereri > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            {detail.pending_cereri} cerere cu camere în așteptare
          </p>
        )}

        {free.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Libere ({free.length})
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
                      + Rezervare
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
              Cereri pe cameră ({cereri.length})
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
              Ocupate ({occupied.length})
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
        <Link
          href={`/admin/calendar?y=${day.iso.slice(0, 4)}&m=${Number(day.iso.slice(5, 7)) - 1}&ws=${mondayOfWeekIso(day.iso)}`}
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          Focus Gantt (săptămâna) →
        </Link>
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
}) {
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
    initialWeekStart ?? mondayOfWeekIso(selectedIso ?? todayIso());

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
        const d = await fetchDayAvailabilityDetailAction(
          iso,
          buildingId,
          featureFilter
        );
        setDetail(d);
        pushParams({ day: iso });
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

  useEffect(() => {
    if (!initialDay) return;
    const frame = window.requestAnimationFrame(() => {
      void selectDay(initialDay);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialDay, selectDay]);

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
    const text = `Casa Emil: ${formatDateWithDay(a!)} – ${formatDateWithDay(b!)} · min ${rangeStats.min} camere libere / noapte`;
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
              ["heat", "% ocupare"],
              ["free", "Camere libere"],
              ["binary", "Plin / liber"],
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
            Lună
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
            7 zile
          </button>
        </div>
      </div>

      <div className="avail-kpi-strip">
        {(
          [
            ["relaxed", kpis.days_relaxed, "Zile cu ≥3 camere libere", "avail-kpi-card--good"],
            ["full", kpis.days_full, "Zile pline", ""],
            [
              "min",
              kpis.min_free_rooms,
              "Minim libere",
              "",
              kpis.min_free_day_iso
                ? `pe ${kpis.min_free_day_iso.slice(8, 10)}.${kpis.min_free_day_iso.slice(5, 7)}`
                : undefined,
            ],
            [
              "cereri",
              kpis.unassigned_nights,
              "Nopți cu cereri nealocate",
              kpis.unassigned_nights > 0 ? "avail-kpi-card--alert" : "",
            ],
          ] as const
        ).map(([key, value, label, extra, sub]) => (
          <button
            key={key}
            type="button"
            className={["avail-kpi-card text-left", extra].filter(Boolean).join(" ")}
            onClick={() => setKpiHelp(key)}
            title="Click pentru explicație"
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
          vs luna trecută:{" "}
          <strong
            className={
              kpis.vs_prev_full_delta > 0 ? "text-rose-700" : "text-emerald-700"
            }
          >
            {kpis.vs_prev_full_delta > 0 ? "+" : ""}
            {kpis.vs_prev_full_delta} zile pline
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
          Toate · {dashboard.total_rooms}
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
            { value: "all" as const, label: "Toate opțiunile" },
            { value: "ac" as const, label: "Cu AC" },
            { value: "fridge" as const, label: "Cu frigider" },
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
            Interval {formatDateWithDay(rangeDays[0]!.iso)} →{" "}
            {formatDateWithDay(rangeDays[rangeDays.length - 1]!.iso)} · minim{" "}
            <strong>{rangeStats.min}</strong> camere libere / noapte
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={copyIntervalText}
            >
              Copiază pentru client
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
              }}
            >
              Șterge interval
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-500">
        Shift+click pe zile pentru interval · Click normal = detalii
      </p>

      <RetroXpWindow title={`Disponibilitate — ${dashboard.title}`}>
      <div className="availability-layout">
        <div className="availability-grid-panel min-w-0">
          {view === "month" ? (
            <>
              <div className="availability-month-matrix">
                <div className="availability-month-grid availability-month-grid--calendar">
                  {WEEK_HEADERS.map((h) => (
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
                        />
                      </div>
                    )
                  )}
                </div>

                <AvailabilityHeatLegend displayMode={displayMode} />
              </div>
            </>
          ) : (
            <div className="availability-week-matrix">
              <div className="availability-month-grid availability-month-grid--calendar">
                {WEEK_HEADERS.map((h) => (
                  <div key={`w-${h}`} className="availability-month-header">
                    {h}
                  </div>
                ))}
              {weekSlots.every((d) => d === null) ? (
                <p className="availability-week-empty">
                  Navighează la luna care conține această săptămână sau alege o zi din
                  lună.
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
                      />
                    </div>
                  );
                })
              )}
              </div>
              <AvailabilityHeatLegend displayMode={displayMode} />
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
                  ← Săpt. anterioară
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
                  Săpt. următoare →
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && selectedIso && (
          <p className="mt-3 text-center text-sm text-zinc-500">Se încarcă cartea de zi…</p>
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
            ? `Carte de zi — ${formatDateWithDay(detail.day.iso, true)}`
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
          />
        )}
      </AdminFloatingPanel>

      <AdminFloatingPanel
        open={!!kpiHelp && !!KPI_HELP[kpiHelp]}
        onClose={() => setKpiHelp(null)}
        title={kpiHelp ? KPI_HELP[kpiHelp].title : undefined}
        variant="modal"
        width={400}
      >
        {kpiHelp && (
          <p className="admin-alert-dialog__message">{KPI_HELP[kpiHelp].body}</p>
        )}
      </AdminFloatingPanel>
    </div>
  );
}
