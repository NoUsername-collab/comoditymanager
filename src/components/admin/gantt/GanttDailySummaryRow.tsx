"use client";

import {
  computeDailyFreeCounts,
  dailyFreeHeatLevel,
} from "@/domain/gantt/daily-free-counts";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { BookingRow } from "@/services/bookings";
import type { GanttRoom } from "@/domain/gantt/types";

function ganttDayGridStyle(dayCount: number): React.CSSProperties {
  return {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
  };
}

export function GanttDailySummaryRow({
  rooms,
  bookings,
  occupancy,
  viewRange,
  compact,
  activeFocusIso,
  filterActive,
  onDayClick,
}: {
  rooms: GanttRoom[];
  bookings: BookingRow[];
  occupancy: OccupancySegment[];
  viewRange: GanttViewRange;
  compact: boolean;
  activeFocusIso: string | null;
  filterActive: boolean;
  onDayClick: (iso: string) => void;
}) {
  const dayIsos = viewRange.days.map((d) => d.iso);
  const counts = computeDailyFreeCounts(rooms, bookings, occupancy, dayIsos);
  const dayCount = viewRange.days.length;

  return (
    <tr className="gantt-summary-row border-b border-zinc-200">
      <td className="gantt-summary-row__label sticky left-0 z-30 border-r border-zinc-200 bg-zinc-50/95 px-3 py-1.5 align-middle">
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Libere
        </span>
        {filterActive && activeFocusIso && (
          <span className="mt-0.5 block text-[9px] font-medium text-emerald-700">
            filtru activ
          </span>
        )}
      </td>
      <td className="gantt-summary-row__days p-0 align-middle">
        <div
          className="gantt-summary-row__grid grid w-full min-w-0"
          style={ganttDayGridStyle(dayCount)}
          role="row"
          aria-label="Camere libere pe zi"
        >
          {viewRange.days.map((col, i) => {
            const { free, total } = counts[i]!;
            const heat = dailyFreeHeatLevel(free, total);
            const isSelected = filterActive && activeFocusIso === col.iso;
            const title =
              total === 0
                ? col.iso
                : `${free} camere libere · click pentru filtru`;

            return (
              <button
                key={col.iso}
                type="button"
                title={title}
                aria-pressed={isSelected}
                aria-label={`${col.iso}: ${free} camere libere`}
                onClick={() => onDayClick(col.iso)}
                className={[
                  "gantt-summary-cell min-w-0 border-r border-zinc-100/80 transition",
                  compact ? "gantt-summary-cell--compact py-1" : "py-1.5",
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
                {!compact && total > 0 && (
                  <span className="gantt-summary-cell__total">camere</span>
                )}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
