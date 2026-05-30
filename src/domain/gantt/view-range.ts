import {
  dayInitialFromIso,
  daysInMonth,
  formatDateWithDay,
  monthYearLabel,
} from "@/lib/ro-calendar";
import { addDays, parseIso, todayIso } from "@/lib/stay-dates";

export type GanttRollingZoom = "today" | "days7" | "days15" | "days30";
export type GanttZoom =
  | GanttRollingZoom
  | "quarter"
  | "month"
  | "week";

export type GanttDayColumn = {
  iso: string;
  weekday: string;
  dayNum: number;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
};

export type GanttViewRange = {
  zoom: GanttZoom;
  periodKey: string;
  title: string;
  days: GanttDayColumn[];
  rangeStart: string;
  rangeEnd: string;
};

export type GanttRangeLabels = {
  today: string;
  days7: string;
  days15: string;
  days30: string;
  quarters: [string, string, string, string];
};

const DEFAULT_LABELS: GanttRangeLabels = {
  today: "Today",
  days7: "7 days",
  days15: "15 days",
  days30: "30 days",
  quarters: ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"],
};

export function mondayOfWeekContaining(iso: string): string {
  const d = parseIso(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayColumns(isoDates: string[], locale: string, today?: string): GanttDayColumn[] {
  const ref = today ?? todayIso();
  return isoDates.map((iso) => {
    const d = parseIso(iso);
    const dow = d.getDay();
    return {
      iso,
      weekday: dayInitialFromIso(iso, locale),
      dayNum: d.getDate(),
      isWeekend: dow === 0 || dow === 6,
      isToday: iso === ref,
      isPast: iso < ref,
    };
  });
}

function isRollingZoom(
  zoom: GanttZoom
): zoom is Exclude<GanttRollingZoom, "days30"> {
  return zoom === "today" || zoom === "days7" || zoom === "days15";
}

function isMonthLikeZoom(zoom: GanttZoom): zoom is "days30" | "month" {
  return zoom === "days30" || zoom === "month";
}

function rollingZoomLength(zoom: GanttRollingZoom): number {
  switch (zoom) {
    case "today":
      return 1;
    case "days7":
      return 7;
    case "days15":
      return 15;
    case "days30":
      return 30;
  }
}

function rollingZoomLabel(zoom: GanttRollingZoom, labels: GanttRangeLabels): string {
  switch (zoom) {
    case "today":
      return labels.today;
    case "days7":
      return labels.days7;
    case "days15":
      return labels.days15;
    case "days30":
      return labels.days30;
  }
}

function buildFixedLengthRange(
  startIso: string,
  length: number,
  zoom: GanttZoom,
  periodKey: string,
  title: string,
  locale: string,
  today?: string
): GanttViewRange {
  const days: string[] = [];
  let cur = startIso;
  for (let i = 0; i < length; i += 1) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  return {
    zoom,
    periodKey,
    title,
    days: buildDayColumns(days, locale, today),
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildRollingRange(
  startIso: string,
  zoom: GanttRollingZoom,
  locale: string,
  labels: GanttRangeLabels = DEFAULT_LABELS,
  today?: string
): GanttViewRange {
  const len = rollingZoomLength(zoom);
  const days: string[] = [];
  let cur = startIso;
  for (let i = 0; i < len; i += 1) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const cols = buildDayColumns(days, locale, today);
  const title =
    len === 1
      ? `${rollingZoomLabel(zoom, labels)} · ${formatDateWithDay(days[0], locale, true)}`
      : `${formatDateWithDay(days[0], locale, true)} – ${formatDateWithDay(
          days[days.length - 1],
          locale,
          true
        )}`;

  return {
    zoom,
    periodKey: `${zoom}-${startIso}`,
    title,
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildMonthRange(
  year: number,
  month: number,
  locale: string,
  today?: string
): GanttViewRange {
  const dim = daysInMonth(year, month);
  const days: string[] = [];
  for (let d = 1; d <= dim; d++) {
    days.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  const cols = buildDayColumns(days, locale, today);
  return {
    zoom: "month",
    periodKey: `m-${year}-${month}`,
    title: monthYearLabel(year, month, locale),
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildAnchoredMonthRange(
  startIso: string,
  zoom: "days30" | "month",
  locale: string,
  today?: string
): GanttViewRange {
  const anchor = parseIso(startIso);
  const canonicalStart = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-01`;
  const length = daysInMonth(anchor.getFullYear(), anchor.getMonth());
  const endIso = addDays(startIso, length - 1);
  const title =
    startIso === canonicalStart
      ? monthYearLabel(anchor.getFullYear(), anchor.getMonth(), locale)
      : `${formatDateWithDay(startIso, locale, true)} – ${formatDateWithDay(endIso, locale, true)}`;

  return buildFixedLengthRange(
    startIso,
    length,
    zoom,
    `${zoom}-${startIso}`,
    title,
    locale,
    today
  );
}

export function buildWeekRange(weekStartIso: string, locale: string, today?: string): GanttViewRange {
  const days: string[] = [];
  let cur = weekStartIso;
  for (let i = 0; i < 7; i++) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  const cols = buildDayColumns(days, locale, today);
  return {
    zoom: "week",
    periodKey: `w-${weekStartIso}`,
    title: `${formatDateWithDay(days[0], locale)} – ${formatDateWithDay(days[6], locale)}`,
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[6], 1),
  };
}

export function buildQuarterRange(
  year: number,
  quarter: number,
  locale: string,
  labels: GanttRangeLabels = DEFAULT_LABELS,
  today?: string
): GanttViewRange {
  const startMonth = quarter * 3;
  const days: string[] = [];
  for (let m = startMonth; m < startMonth + 3; m++) {
    const dim = daysInMonth(year, m);
    for (let d = 1; d <= dim; d++) {
      days.push(
        `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
  }
  const cols = buildDayColumns(days, locale, today);
  return {
    zoom: "quarter",
    periodKey: `q-${year}-${quarter}`,
    title: `${labels.quarters[quarter]} ${year}`,
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildAnchoredQuarterRange(
  startIso: string,
  locale: string,
  labels: GanttRangeLabels = DEFAULT_LABELS,
  today?: string
): GanttViewRange {
  const anchor = parseIso(startIso);
  const quarter = Math.floor(anchor.getMonth() / 3);
  const quarterStartMonth = quarter * 3;
  const canonicalStart = `${anchor.getFullYear()}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;
  let length = 0;
  for (let month = quarterStartMonth; month < quarterStartMonth + 3; month += 1) {
    length += daysInMonth(anchor.getFullYear(), month);
  }
  const endIso = addDays(startIso, length - 1);
  const title =
    startIso === canonicalStart
      ? `${labels.quarters[quarter]} ${anchor.getFullYear()}`
      : `${formatDateWithDay(startIso, locale, true)} – ${formatDateWithDay(endIso, locale, true)}`;

  return buildFixedLengthRange(
    startIso,
    length,
    "quarter",
    `quarter-${startIso}`,
    title,
    locale,
    today
  );
}

export function resolveGanttRange(params: {
  y?: number;
  m?: number;
  zoom?: string;
  ws?: string;
  q?: number;
  locale?: string;
  labels?: GanttRangeLabels;
  /** Effective "today" — pass sim date when simulation is active */
  today?: string;
}): GanttViewRange {
  const locale = params.locale ?? "ro";
  const labels = params.labels ?? DEFAULT_LABELS;
  const effectiveToday = params.today ?? todayIso();
  const refDate = parseIso(effectiveToday);
  const year = params.y ?? refDate.getFullYear();
  const month = params.m ?? refDate.getMonth();
  const zoom = (params.zoom as GanttZoom) || "days30";
  const validWs =
    params.ws && /^\d{4}-\d{2}-\d{2}$/.test(params.ws) ? params.ws : undefined;

  if (isRollingZoom(zoom)) {
    const ws = validWs ?? effectiveToday;
    return buildRollingRange(ws, zoom, locale, labels, effectiveToday);
  }

  if (isMonthLikeZoom(zoom)) {
    if (validWs) return buildAnchoredMonthRange(validWs, zoom, locale, effectiveToday);
    return {
      ...buildMonthRange(year, month, locale, effectiveToday),
      zoom,
      periodKey: `${zoom}-${year}-${month}`,
    };
  }

  if (zoom === "week") {
    const ws = validWs ?? mondayOfWeekContaining(effectiveToday);
    return buildRollingRange(ws, "days7", locale, labels, effectiveToday);
  }

  if (zoom === "quarter") {
    if (validWs) return buildAnchoredQuarterRange(validWs, locale, labels, effectiveToday);
    const q =
      params.q !== undefined && params.q >= 0 && params.q <= 3
        ? params.q
        : Math.floor(month / 3);
    return buildQuarterRange(year, q, locale, labels, effectiveToday);
  }

  return buildMonthRange(year, month, locale, effectiveToday);
}

export function navigateRange(
  range: GanttViewRange,
  direction: -1 | 1,
  year: number,
  month: number
): { y: number; m: number; zoom: GanttZoom; ws?: string; q?: number } {
  const isAnchoredFixedRange =
    (range.zoom === "quarter" && range.periodKey.startsWith("quarter-")) ||
    ((range.zoom === "days30" || range.zoom === "month") &&
      range.periodKey.startsWith(`${range.zoom}-`) &&
      range.periodKey.split("-").length >= 4);

  if (isRollingZoom(range.zoom)) {
    const ws = addDays(range.days[0].iso, direction * rollingZoomLength(range.zoom));
    const d = parseIso(ws);
    return {
      y: d.getFullYear(),
      m: d.getMonth(),
      zoom: range.zoom,
      ws,
    };
  }
  if (range.zoom === "quarter") {
    if (isAnchoredFixedRange) {
      const ws = addDays(range.days[0].iso, direction * range.days.length);
      const d = parseIso(ws);
      return {
        y: d.getFullYear(),
        m: d.getMonth(),
        zoom: "quarter",
        ws,
        q: Math.floor(d.getMonth() / 3),
      };
    }
    const q = Number(range.periodKey.split("-")[2]) + direction;
    if (q < 0) return { y: year - 1, m: 9, zoom: "quarter", q: 3 };
    if (q > 3) return { y: year + 1, m: 0, zoom: "quarter", q: 0 };
    return { y: year, m: q * 3, zoom: "quarter", q };
  }
  if (isMonthLikeZoom(range.zoom) && isAnchoredFixedRange) {
    const ws = addDays(range.days[0].iso, direction * range.days.length);
    const d = parseIso(ws);
    return {
      y: d.getFullYear(),
      m: d.getMonth(),
      zoom: range.zoom,
      ws,
    };
  }
  let nm = month + direction;
  let ny = year;
  if (nm < 0) {
    nm = 11;
    ny -= 1;
  }
  if (nm > 11) {
    nm = 0;
    ny += 1;
  }
  return {
    y: ny,
    m: nm,
    zoom: isMonthLikeZoom(range.zoom) ? range.zoom : "month",
  };
}
