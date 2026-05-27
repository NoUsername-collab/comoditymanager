"use client";

import {
  type DailyFreeCount,
  dailyFreeHeatLevel,
} from "@/domain/gantt/daily-free-counts";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import { useTranslations } from "next-intl";

function ganttDayGridStyle(dayCount: number): React.CSSProperties {
  return {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
  };
}

export function GanttDailySummaryRow({
  counts,
  viewRange,
  compact,
  activeFocusIso,
  filterActive,
  onDayClick,
  onPanPointerDown,
  panActive = false,
}: {
  counts: DailyFreeCount[];
  viewRange: GanttViewRange;
  compact: boolean;
  activeFocusIso: string | null;
  filterActive: boolean;
  onDayClick: (iso: string) => void;
  onPanPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  panActive?: boolean;
}) {
  const tCommon = useTranslations("admin.common");
  const dayCount = viewRange.days.length;

  return (
    <tr className="gantt-summary-row border-b border-zinc-200">
      <td className="gantt-summary-row__label sticky left-0 z-30 border-r border-zinc-200 px-3 py-1.5 align-middle">
        <span className="gantt-summary-row__label-title">
          {tCommon("free")}
        </span>
        {filterActive && activeFocusIso && (
          <span className="gantt-summary-row__label-state">
            {tCommon("activeFilter")}
          </span>
        )}
      </td>
      <td className="gantt-summary-row__days p-0 align-middle">
        <div
          className={[
            "gantt-summary-row__grid grid w-full min-w-0",
            "gantt-summary-row__grid--pan",
            panActive && "gantt-summary-row__grid--panning",
          ]
            .filter(Boolean)
            .join(" ")}
          style={ganttDayGridStyle(dayCount)}
          role="row"
          aria-label={tCommon("freeRoomsByDay")}
          onPointerDown={onPanPointerDown}
          title={tCommon("scrollDrag")}
        >
          {viewRange.days.map((col, i) => {
            const { free, total } = counts[i]!;
            const heat = dailyFreeHeatLevel(free, total);
            const isSelected = filterActive && activeFocusIso === col.iso;
            const title =
              total === 0
                ? col.iso
                : tCommon("freeRoomsFilterTitle", { count: free });

            return (
              <button
                key={col.iso}
                type="button"
                title={title}
                aria-pressed={isSelected}
                aria-label={tCommon("freeRoomsForDate", { iso: col.iso, count: free })}
                onClick={() => onDayClick(col.iso)}
                className={[
                  "gantt-summary-cell min-w-0 border-r border-zinc-100/80 transition",
                  compact ? "gantt-summary-cell--compact py-[0.25rem]" : "py-[0.36rem]",
                  col.isWeekend && "gantt-summary-cell--weekend",
                  col.isToday && "gantt-summary-cell--today",
                  `gantt-summary-cell--${heat}`,
                  isSelected && "gantt-summary-cell--selected",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="gantt-summary-cell__value tabular-nums">
                  {free}
                </span>
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
