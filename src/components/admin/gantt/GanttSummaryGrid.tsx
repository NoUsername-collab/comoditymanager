"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { DailyFreeCount } from "@/domain/gantt/daily-free-counts";
import { dailyFreeHeatLevel } from "@/domain/gantt/daily-free-counts";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import { ganttDayGridStyle, type GanttDayGridOptions } from "./GanttGridHelpers";

export function GanttSummaryGrid({
  counts,
  viewRange,
  compact,
  activeFocusIso,
  filterActive,
  onDayClick,
  onPanPointerDown,
  panActive = false,
  ariaLabel,
  scrollTitle,
  dayTitle,
  dayAriaLabel,
  dayGridOptions,
}: {
  counts: DailyFreeCount[];
  viewRange: GanttViewRange;
  compact: boolean;
  activeFocusIso: string | null;
  filterActive: boolean;
  onDayClick: (iso: string) => void;
  onPanPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  panActive?: boolean;
  ariaLabel: string;
  scrollTitle: string;
  dayTitle: (iso: string, free: number, total: number) => string;
  dayAriaLabel: (iso: string, free: number) => string;
  dayGridOptions?: GanttDayGridOptions;
}) {
  return (
    <div
      className={[
        "gantt-summary-row__grid grid w-full min-w-0",
        dayGridOptions?.fixed && "gantt-day-grid--fixed",
        "gantt-summary-row__grid--pan",
        panActive && "gantt-summary-row__grid--panning",
      ]
        .filter(Boolean)
        .join(" ")}
      style={ganttDayGridStyle(viewRange.days.length, dayGridOptions)}
      role="row"
      aria-label={ariaLabel}
      onPointerDown={onPanPointerDown}
      title={scrollTitle}
    >
      {viewRange.days.map((col, i) => {
        const { free, total } = counts[i]!;
        const heat = dailyFreeHeatLevel(free, total);
        const isSelected = filterActive && activeFocusIso === col.iso;
        const title = dayTitle(col.iso, free, total);

        return (
          <button
            key={col.iso}
            type="button"
            title={title}
            aria-pressed={isSelected}
            aria-label={dayAriaLabel(col.iso, free)}
            onClick={() => onDayClick(col.iso)}
            className={[
              "gantt-summary-cell min-w-0 border-r border-zinc-100/80 transition",
              compact ? "gantt-summary-cell--compact py-[0.25rem]" : "py-[0.36rem]",
              col.isWeekend && "gantt-summary-cell--weekend",
              col.isToday && "gantt-summary-cell--today",
              col.isPast && "gantt-summary-cell--past",
              `gantt-summary-cell--${heat}`,
              isSelected && "gantt-summary-cell--selected",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="gantt-summary-cell__value tabular-nums">{free}</span>
          </button>
        );
      })}
    </div>
  );
}
