import { daysInMonth } from "@/lib/ro-calendar";
import { addDays, parseIso, todayIso } from "@/lib/stay-dates";
import { dayInitialFromIso, formatDateWithDay } from "@/lib/ro-calendar";

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
};

export type GanttViewRange = {
  zoom: GanttZoom;
  periodKey: string;
  title: string;
  days: GanttDayColumn[];
  rangeStart: string;
  rangeEnd: string;
};

export function mondayOfWeekContaining(iso: string): string {
  const d = parseIso(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayColumns(isoDates: string[]): GanttDayColumn[] {
  const today = todayIso();
  return isoDates.map((iso) => {
    const d = parseIso(iso);
    const dow = d.getDay();
    return {
      iso,
      weekday: dayInitialFromIso(iso),
      dayNum: d.getDate(),
      isWeekend: dow === 0 || dow === 6,
      isToday: iso === today,
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

function rollingZoomLabel(zoom: GanttRollingZoom): string {
  switch (zoom) {
    case "today":
      return "Azi";
    case "days7":
      return "7 zile";
    case "days15":
      return "15 zile";
    case "days30":
      return "30 zile";
  }
}

function buildFixedLengthRange(
  startIso: string,
  length: number,
  zoom: GanttZoom,
  periodKey: string,
  title: string
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
    days: buildDayColumns(days),
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildRollingRange(
  startIso: string,
  zoom: GanttRollingZoom
): GanttViewRange {
  const len = rollingZoomLength(zoom);
  const days: string[] = [];
  let cur = startIso;
  for (let i = 0; i < len; i += 1) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  const cols = buildDayColumns(days);
  const title =
    len === 1
      ? `${rollingZoomLabel(zoom)} · ${formatDateWithDay(days[0], true)}`
      : `${formatDateWithDay(days[0], true)} – ${formatDateWithDay(
          days[days.length - 1],
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

export function buildMonthRange(year: number, month: number): GanttViewRange {
  const dim = daysInMonth(year, month);
  const days: string[] = [];
  for (let d = 1; d <= dim; d++) {
    days.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  const cols = buildDayColumns(days);
  return {
    zoom: "month",
    periodKey: `m-${year}-${month}`,
    title: new Date(year, month, 1).toLocaleDateString("ro-RO", {
      month: "long",
      year: "numeric",
    }),
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildAnchoredMonthRange(
  startIso: string,
  zoom: "days30" | "month"
): GanttViewRange {
  const anchor = parseIso(startIso);
  const canonicalStart = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-01`;
  const length = daysInMonth(anchor.getFullYear(), anchor.getMonth());
  const endIso = addDays(startIso, length - 1);
  const title =
    startIso === canonicalStart
      ? new Date(anchor.getFullYear(), anchor.getMonth(), 1).toLocaleDateString(
          "ro-RO",
          {
            month: "long",
            year: "numeric",
          }
        )
      : `${formatDateWithDay(startIso, true)} – ${formatDateWithDay(endIso, true)}`;

  return buildFixedLengthRange(
    startIso,
    length,
    zoom,
    `${zoom}-${startIso}`,
    title
  );
}

export function buildWeekRange(weekStartIso: string): GanttViewRange {
  const days: string[] = [];
  let cur = weekStartIso;
  for (let i = 0; i < 7; i++) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  const cols = buildDayColumns(days);
  return {
    zoom: "week",
    periodKey: `w-${weekStartIso}`,
    title: `${formatDateWithDay(days[0])} – ${formatDateWithDay(days[6])}`,
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[6], 1),
  };
}

export function buildQuarterRange(year: number, quarter: number): GanttViewRange {
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
  const cols = buildDayColumns(days);
  const labels = ["Ian–Mar", "Apr–Iun", "Iul–Sep", "Oct–Dec"];
  return {
    zoom: "quarter",
    periodKey: `q-${year}-${quarter}`,
    title: `${labels[quarter]} ${year}`,
    days: cols,
    rangeStart: days[0],
    rangeEnd: addDays(days[days.length - 1], 1),
  };
}

export function buildAnchoredQuarterRange(startIso: string): GanttViewRange {
  const anchor = parseIso(startIso);
  const quarter = Math.floor(anchor.getMonth() / 3);
  const quarterStartMonth = quarter * 3;
  const canonicalStart = `${anchor.getFullYear()}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;
  let length = 0;
  for (let month = quarterStartMonth; month < quarterStartMonth + 3; month += 1) {
    length += daysInMonth(anchor.getFullYear(), month);
  }
  const endIso = addDays(startIso, length - 1);
  const labels = ["Ian–Mar", "Apr–Iun", "Iul–Sep", "Oct–Dec"];
  const title =
    startIso === canonicalStart
      ? `${labels[quarter]} ${anchor.getFullYear()}`
      : `${formatDateWithDay(startIso, true)} – ${formatDateWithDay(endIso, true)}`;

  return buildFixedLengthRange(
    startIso,
    length,
    "quarter",
    `quarter-${startIso}`,
    title
  );
}

export function resolveGanttRange(params: {
  y?: number;
  m?: number;
  zoom?: string;
  ws?: string;
  q?: number;
}): GanttViewRange {
  const now = new Date();
  const year = params.y ?? now.getFullYear();
  const month = params.m ?? now.getMonth();
  const zoom = (params.zoom as GanttZoom) || "days30";
  const validWs =
    params.ws && /^\d{4}-\d{2}-\d{2}$/.test(params.ws) ? params.ws : undefined;

  if (isRollingZoom(zoom)) {
    const ws = validWs ?? todayIso();
    return buildRollingRange(ws, zoom);
  }

  if (isMonthLikeZoom(zoom)) {
    if (validWs) return buildAnchoredMonthRange(validWs, zoom);
    return {
      ...buildMonthRange(year, month),
      zoom,
      periodKey: `${zoom}-${year}-${month}`,
    };
  }

  if (zoom === "week") {
    const ws = validWs ?? mondayOfWeekContaining(todayIso());
    return buildRollingRange(ws, "days7");
  }

  if (zoom === "quarter") {
    if (validWs) return buildAnchoredQuarterRange(validWs);
    const q =
      params.q !== undefined && params.q >= 0 && params.q <= 3
        ? params.q
        : Math.floor(month / 3);
    return buildQuarterRange(year, q);
  }

  return buildMonthRange(year, month);
}

export function navigateRange(
  range: GanttViewRange,
  direction: -1 | 1,
  year: number,
  month: number
): { y: number; m: number; zoom: GanttZoom; ws?: string; q?: number } {
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
    const q = Number(range.periodKey.split("-")[2]) + direction;
    if (q < 0) return { y: year - 1, m: 9, zoom: "quarter", q: 3 };
    if (q > 3) return { y: year + 1, m: 0, zoom: "quarter", q: 0 };
    return { y: year, m: q * 3, zoom: "quarter", q };
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
