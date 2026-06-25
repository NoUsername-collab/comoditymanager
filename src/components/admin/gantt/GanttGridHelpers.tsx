"use client";

import type { CSSProperties } from "react";
import type { GanttViewRange, GanttZoom } from "@/domain/gantt/view-range";
import { ganttDayTimeStyle } from "@/lib/gantt-time";
import { addDays } from "@/lib/stay-dates";

import type { GanttDensity } from "@/hooks/useGanttDensity";

/** Shell `data-gantt-zoom` token for CSS zoom grammar. */
export type GanttShellZoom = "7z" | "15z" | "30z" | "quarter";

export function resolveGanttShellZoom(zoom: GanttZoom): GanttShellZoom {
  if (zoom === "today" || zoom === "days7" || zoom === "week") return "7z";
  if (zoom === "days15") return "15z";
  if (zoom === "days30" || zoom === "month") return "30z";
  return "quarter";
}

export function drillDownZoomFrom(current: InlineZoomChoice): InlineZoomChoice | null {
  switch (current) {
    case "quarter":
      return "days30";
    case "days30":
      return "days7";
    case "days15":
      return "days7";
    case "days7":
      return "today";
    default:
      return null;
  }
}

function isInOperationalWindow(iso: string, today: string): boolean {
  return iso >= today && iso < addDays(today, 7);
}

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
  density: GanttDensity,
  isPortrait: boolean,
  dayMin: string,
  dayCount: number
): GanttDayGridOptions | undefined {
  if (compactChrome && isPortrait) {
    return { dayMin, fixed: dayCount > 7 };
  }
  if (!compactChrome && density === "comfortable" && dayCount > 7) {
    return { dayMin, fixed: true };
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
      gridTemplateColumns: `repeat(${dayCount}, minmax(${options.dayMin}, 1fr))`,
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

/** Pixel width of the day timeline when columns are fixed-width. */
export function ganttTimelineWidth(dayCount: number, dayMin: string): string {
  return `calc(${dayCount} * ${dayMin})`;
}

export type GanttTableLayout = {
  roomCol: string;
  daysCol: string;
  tableWidth: string;
  tableMinWidth: string;
};

/** Table always fills viewport; scroll only when timeline min width exceeds screen. */
export function resolveGanttTableLayout(
  dayCount: number,
  metrics: GanttColumnMetrics
): GanttTableLayout {
  const timeline = ganttTimelineWidth(dayCount, metrics.dayMin);
  return {
    roomCol: metrics.roomCol,
    daysCol: "auto",
    tableWidth: "100%",
    tableMinWidth: `max(100%, calc(${metrics.roomCol} + ${timeline}))`,
  };
}

export function dayCellClass(
  col: { isWeekend: boolean; isToday: boolean; isPast: boolean; iso: string },
  compact: boolean,
  touch: boolean,
  options?: {
    turnover?: boolean;
    operationalWindow?: boolean;
  }
) {
  return [
    GANTT_DAY_CELL,
    compact && "gantt-day-cell--compact",
    touch && "gantt-day-cell--touch",
    col.isWeekend && "gantt-day-cell--weekend",
    col.isToday && "gantt-day-cell--today",
    col.isPast && "gantt-day-cell--past",
    options?.turnover && "gantt-day-cell--turnover",
    options?.operationalWindow && "gantt-day-cell--operational-window",
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
  turnoverIsos,
  shellZoom,
  effectiveToday,
}: {
  columns: GanttViewRange["days"];
  compact: boolean;
  touch: boolean;
  checkInTime: string;
  checkOutTime: string;
  dayGridOptions?: GanttDayGridOptions;
  turnoverIsos?: Set<string>;
  shellZoom?: GanttShellZoom;
  effectiveToday?: string;
}) {
  const showOperationalWindow =
    shellZoom === "15z" || shellZoom === "30z";
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
      {columns.map((col) => {
        const hasTurnover =
          turnoverIsos?.has(col.iso) ||
          (col.weekEndIso != null &&
            [...(turnoverIsos ?? [])].some(
              (iso) => iso >= col.iso && iso <= col.weekEndIso
            ));
        return (
        <div
          key={col.iso}
          className={dayCellClass(col, compact, touch, {
            turnover: hasTurnover,
            operationalWindow:
              showOperationalWindow &&
              effectiveToday != null &&
              isInOperationalWindow(col.iso, effectiveToday),
          })}
        />
      );
      })}
    </div>
  );
}
