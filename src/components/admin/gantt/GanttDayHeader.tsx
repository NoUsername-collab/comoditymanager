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
} from "./GanttGridHelpers";

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
}) {
  const tCommon = useTranslations("admin.common");

  const handleDayClick = (iso: string) => {
    if (!onDayDrillDown) return;
    onDayDrillDown(iso);
  };

  return (
    <div
      className={[
        "gantt-day-header-grid grid w-full min-w-0 border-b border-zinc-300 bg-[var(--admin-surface-bg,var(--surface))]",
        dayGridOptions?.fixed && "gantt-day-grid--fixed",
        "gantt-day-header-grid--pan",
        panActive && "gantt-day-header-grid--panning",
      ]
        .filter(Boolean)
        .join(" ")}
      style={ganttDayGridStyle(columns.length, dayGridOptions)}
      data-gantt-day-grid=""
      data-gantt-day-count={columns.length}
      onPointerDown={onPanPointerDown}
      title={scrollTitle}
    >
      {columns.map((col) => (
        <div key={col.iso} className="gantt-day-header-col flex min-w-0 flex-col">
          <span
            className={[
              "gantt-day-azi-above",
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
          </button>
        </div>
      ))}
    </div>
  );
});
