import { daysInMonth } from "@/lib/ro-calendar";
import { addDays, parseIso, todayIso } from "@/lib/stay-dates";
import { dayInitialFromIso, formatDateWithDay } from "@/lib/ro-calendar";

export type GanttZoom = "month" | "week" | "quarter";

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
  const zoom = (params.zoom as GanttZoom) || "month";

  if (zoom === "week") {
    const ws =
      params.ws && /^\d{4}-\d{2}-\d{2}$/.test(params.ws)
        ? params.ws
        : mondayOfWeekContaining(todayIso());
    return buildWeekRange(ws);
  }

  if (zoom === "quarter") {
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
  if (range.zoom === "week") {
    const ws = addDays(range.days[0].iso, direction * 7);
    return { y: parseIso(ws).getFullYear(), m: parseIso(ws).getMonth(), zoom: "week", ws };
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
  return { y: ny, m: nm, zoom: "month" };
}
