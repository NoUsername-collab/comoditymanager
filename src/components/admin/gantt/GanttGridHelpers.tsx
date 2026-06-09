"use client";

import type { CSSProperties } from "react";
import type { GanttViewRange } from "@/domain/gantt/view-range";
import { ganttDayTimeStyle } from "@/lib/gantt-time";

export const ROOM_COL_W = "7.7rem";
export const DAY_COL_MIN_W = "2.25rem";

export type GanttColumnMetrics = {
  roomCol: string;
  dayMin: string;
};

export type GanttDayGridOptions = {
  dayMin: string;
  /** Fixed column width — enables horizontal scroll instead of squeezing into viewport */
  fixed?: boolean;
};

/** Column widths for compact chrome (portrait / landscape). */
export function resolveGanttColumnMetrics(
  compactChrome: boolean,
  orientation: "portrait" | "landscape"
): GanttColumnMetrics {
  if (!compactChrome) {
    return { roomCol: ROOM_COL_W, dayMin: DAY_COL_MIN_W };
  }
  if (orientation === "landscape") {
    return { roomCol: "4.25rem", dayMin: "1.125rem" };
  }
  /* Portrait: narrower room col — more day columns visible */
  return { roomCol: "3.5rem", dayMin: DAY_COL_MIN_W };
}

/** Portrait mobile: ≤7d stretches to viewport; 15/30d uses fixed cols + horizontal scroll. */
export function resolveGanttDayGridOptions(
  compactChrome: boolean,
  isPortrait: boolean,
  dayMin: string,
  dayCount: number
): GanttDayGridOptions | undefined {
  if (compactChrome && isPortrait) {
    return { dayMin, fixed: dayCount > 7 };
  }
  return undefined;
}

export const GANTT_DAY_CELL =
  "gantt-day-cell min-w-0 bg-white shadow-[inset_0_0_0_1px_#d4d4d8]";

export type InlineZoomChoice = "today" | "days7" | "days15" | "days30" | "quarter";

export const QUICK_SHIFT_STEPS = [{ days: 1 }, { days: 7 }, { days: 15 }, { days: 30 }] as const;

export function ToolbarFilterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h12" />
      <path d="M6.5 10h7" />
      <path d="M8.5 14h3" />
      <circle cx="6.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export type StickyViewportState = {
  active: boolean;
  left: number;
  width: number;
  roomColumnWidth: number;
  daysContentWidth: number;
  scrollLeft: number;
};

export function normalizeZoomChoice(zoom: string): InlineZoomChoice {
  if (zoom === "week") return "days7";
  if (zoom === "month") return "days30";
  if (zoom === "today" || zoom === "days7" || zoom === "days15" || zoom === "days30") {
    return zoom;
  }
  return "quarter";
}

export function periodStepMeta(
  zoom: InlineZoomChoice,
  tCommon: (key: string) => string
): { label: string; aria: string } {
  switch (zoom) {
    case "today":
      return { label: tCommon("stepOneDay"), aria: tCommon("oneDayAria") };
    case "days7":
      return { label: tCommon("stepOneWeek"), aria: tCommon("oneWeekAria") };
    case "days15":
      return { label: tCommon("stepFifteenDays"), aria: tCommon("fifteenDaysAria") };
    case "days30":
      return { label: tCommon("stepOneMonth"), aria: tCommon("oneMonthAria") };
    case "quarter":
      return { label: tCommon("stepOneQuarter"), aria: tCommon("oneQuarterAria") };
  }
}

export function quickShiftMeta(
  days: number,
  tCommon: (key: string) => string
): { label: string; shortLabel: string } {
  if (days === 1) return { label: tCommon("oneDayAria"), shortLabel: "1d" };
  if (days === 7) return { label: tCommon("oneWeekAria"), shortLabel: "1w" };
  if (days === 15) return { label: tCommon("fifteenDaysAria"), shortLabel: "15d" };
  return { label: tCommon("oneMonthAria"), shortLabel: "30d" };
}

export function ganttDayGridStyle(
  dayCount: number,
  options?: GanttDayGridOptions
): CSSProperties {
  if (options?.fixed && options.dayMin) {
    return {
      gridTemplateColumns: `repeat(${dayCount}, ${options.dayMin})`,
    };
  }
  if (options?.dayMin) {
    return {
      gridTemplateColumns: `repeat(${dayCount}, minmax(${options.dayMin}, 1fr))`,
    };
  }
  return {
    gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
  };
}

export function dayCellClass(
  col: { isWeekend: boolean; isToday: boolean; isPast: boolean },
  compact: boolean,
  touch: boolean
) {
  return [
    GANTT_DAY_CELL,
    compact && "gantt-day-cell--compact",
    touch && "gantt-day-cell--touch",
    col.isWeekend && "gantt-day-cell--weekend",
    col.isToday && "gantt-day-cell--today",
    col.isPast && "gantt-day-cell--past",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Header zile — fără zone/hasură din grila de cazare */
export function dayHeaderCellClass(
  col: { isWeekend: boolean; isToday: boolean; isPast: boolean },
  compact: boolean
) {
  return [
    "gantt-day-header-cell min-w-0",
    compact && "gantt-day-header-cell--compact",
    col.isWeekend && "gantt-day-header-cell--weekend",
    col.isToday && "gantt-day-header-cell--today",
    col.isPast && "gantt-day-header-cell--past",
  ]
    .filter(Boolean)
    .join(" ");
}

export function DayGrid({
  columns,
  compact,
  touch,
  checkInTime,
  checkOutTime,
  dayGridOptions,
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
  touch: boolean;
  checkInTime: string;
  checkOutTime: string;
  dayGridOptions?: GanttDayGridOptions;
}) {
  return (
    <div
      className={[
        "gantt-day-grid gantt-day-grid--timed grid h-full w-full min-w-0 bg-white shadow-[inset_1px_0_0_0_#d4d4d8]",
        dayGridOptions?.fixed && "gantt-day-grid--fixed",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...ganttDayGridStyle(columns.length, dayGridOptions),
        ...ganttDayTimeStyle(checkInTime, checkOutTime),
      }}
    >
      {columns.map((col) => (
        <div key={col.iso} className={dayCellClass(col, compact, touch)} />
      ))}
    </div>
  );
}
