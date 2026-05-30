"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import {
  formatWeekdayNarrow,
  formatWeekdayShort,
} from "@/lib/ro-calendar";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import { ganttDayGridStyle, dayHeaderCellClass } from "./GanttGridHelpers";

export function GanttDayHeader({
  columns,
  compact,
  onPanPointerDown,
  panActive = false,
  scrollTitle,
  todayLabel,
  locale,
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
  scrollTitle: string;
  todayLabel: string;
  locale: string;
}) {
  return (
    <div
      className={[
        "gantt-day-header-grid grid w-full min-w-0 border-b border-zinc-300 bg-gradient-to-b from-slate-50 to-zinc-100/90",
        "gantt-day-header-grid--pan",
        panActive && "gantt-day-header-grid--panning",
      ]
        .filter(Boolean)
        .join(" ")}
      style={ganttDayGridStyle(columns.length)}
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
          <div
            className={[
              dayHeaderCellClass(col, compact),
              "gantt-day-header-cell__body flex flex-1 flex-col items-center justify-center text-center leading-tight",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="gantt-day-header-cell__date tabular-nums">
              {col.dayNum}
            </span>
            <span className="gantt-day-header-cell__weekday">
              {compact
                ? formatWeekdayNarrow(col.iso, locale)
                : formatWeekdayShort(col.iso, locale)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
