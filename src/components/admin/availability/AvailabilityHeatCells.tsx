"use client";

import { memo, useRef, useState } from "react";
import { heatLevelClass, pressureLabel } from "@/domain/availability/heat";
import { formatDateWithDay } from "@/lib/ro-calendar";
import { parseIso, todayIso } from "@/lib/stay-dates";
import type { DayAvailability } from "@/services/availability-month";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";

export type AvailabilityDisplayMode = "heat" | "free" | "binary";

export function AvailabilityHeatLegend({
  displayMode,
  labels,
}: {
  displayMode: AvailabilityDisplayMode;
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

export const HeatDayCell = memo(function HeatDayCell({
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
  displayMode: AvailabilityDisplayMode;
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
            {day.free_rooms}/{day.total_rooms} {labels.freeRooms.toLowerCase()} ·{" "}
            {day.occupancy_pct}% {labels.occupancy.toLowerCase()}
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
});
