"use client";

import { memo, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import {
  formatWeekdayNarrow,
  formatWeekdayShort,
} from "@/lib/ro-calendar";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import {
  ganttDayGridStyle,
  dayHeaderCellClass,
  type GanttDayGridOptions,
  type GanttShellZoom,
} from "./GanttGridHelpers";
import { ganttDayTimeStyle } from "@/lib/gantt-time";

function parseIsoDay(iso: string): number {
  return Number.parseInt(iso.slice(8, 10), 10);
}

export const GanttDayHeader = memo(function GanttDayHeader({
  columns,
  compact,
  onPanPointerDown,
  panActive = false,
  scrollTitle,
  todayLabel,
  locale,
  dayGridOptions,
  columnGranularity,
  onDayDrillDown,
  checkInTime,
  checkOutTime,
  shellZoom,
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
  scrollTitle: string;
  todayLabel: string;
  locale: string;
  dayGridOptions?: GanttDayGridOptions;
  columnGranularity?: GanttViewRange["columnGranularity"];
  onDayDrillDown?: (iso: string) => void;
  checkInTime: string;
  checkOutTime: string;
  shellZoom?: GanttShellZoom;
}) {
  const tCommon = useTranslations("admin.common");

  const handleDayClick = (iso: string) => {
    if (!onDayDrillDown) return;
    onDayDrillDown(iso);
  };

  return (
    <div
      className={[
        "gantt-day-header-grid gantt-day-grid--timed grid w-full min-w-0 border-b border-zinc-300 bg-[var(--admin-surface-bg,var(--surface))]",
        dayGridOptions?.fixed && "gantt-day-grid--fixed",
        "gantt-day-header-grid--pan",
        panActive && "gantt-day-header-grid--panning",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...ganttDayGridStyle(columns.length, dayGridOptions),
        ...ganttDayTimeStyle(checkInTime, checkOutTime),
      }}
      data-gantt-day-grid=""
      data-gantt-day-count={columns.length}
      data-gantt-zoom={shellZoom}
      onPointerDown={onPanPointerDown}
      title={scrollTitle}
    >
      {columns.map((col) => (
        <div key={col.iso} className="gantt-day-header-col flex min-w-0 flex-col">
          <span
            className={[
              "gantt-day-today-above",
              !col.isToday && "invisible",
            ].join(" ")}
            aria-hidden={!col.isToday}
          >
            {todayLabel}
          </span>
          <button
            type="button"
            className={[
              dayHeaderCellClass(col, compact),
              "gantt-day-header-cell__body flex flex-1 flex-col items-center justify-center text-center leading-tight",
              onDayDrillDown && "gantt-day-header-cell--drillable",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleDayClick(col.iso)}
            aria-label={
              onDayDrillDown
                ? tCommon("ganttDrillDownAria", { date: col.iso })
                : undefined
            }
            disabled={!onDayDrillDown}
          >
            <span className="gantt-day-header-cell__date tabular-nums">
              {columnGranularity === "week" && col.weekEndIso
                ? `${col.dayNum}–${parseIsoDay(col.weekEndIso)}`
                : col.dayNum}
            </span>
            <span className="gantt-day-header-cell__weekday">
              {compact
                ? formatWeekdayNarrow(col.iso, locale)
                : formatWeekdayShort(col.iso, locale)}
            </span>
            {columnGranularity !== "week" ? (
              <span className="gantt-day-zone-preview" aria-hidden>
                <span className="gantt-day-zone-preview__out" />
                <span className="gantt-day-zone-preview__clean" />
                <span className="gantt-day-zone-preview__in" />
              </span>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  );
});
