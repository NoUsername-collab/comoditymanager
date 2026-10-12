/** Gantt row height (−15% from 56px). */
export const GANTT_ROW_H = 48;

/** Desktop compact density — keep in sync with --gantt-row-h in gantt-premium-shell.css */
export const GANTT_ROW_H_COMPACT = 28;

export type GanttCoverage = 10 | 20 | 30;

const GANTT_ROW_H_MIN = 22;

/** Building label row. Matches the desktop header, so it is not counted as a room. */
export const GANTT_BUILDING_HEADER_H = 22;

const COVERAGE_FALLBACK_ROW_H: Record<GanttCoverage, number> = {
  10: GANTT_ROW_H,
  20: 36,
  30: GANTT_ROW_H_COMPACT,
};

function ganttBarTop(rowH: number, barH: number): number {
  return Math.round((rowH - barH) / 2);
}

export function parseGanttCoverage(raw: string | null | undefined): GanttCoverage {
  if (raw === "10" || raw === "20" || raw === "30") return Number(raw) as GanttCoverage;
  if (raw === "comfortable") return 10;
  if (raw === "compact") return 30;
  return 20;
}

type GanttRowMetrics = {
  rowH: number;
  stayH: number;
  stayTop: number;
  occH: number;
  occTop: number;
  unassignedH: number;
};

/** How many building labels sit above the first `roomSlots` rooms. */
export function buildingHeadersInFirstRooms(
  groups: { id: string; roomCount: number }[],
  collapsed: ReadonlySet<string>,
  roomSlots: number,
): number {
  if (roomSlots < 1) return 0;
  let rooms = 0;
  let headers = 0;
  for (const group of groups) {
    if (rooms >= roomSlots) break;
    headers += 1;
    if (!collapsed.has(group.id)) rooms += group.roomCount;
  }
  return headers;
}

export function resolveGanttRowMetrics(
  coverage: GanttCoverage,
  availableHeightPx?: number | null,
  reservedHeightPx = 0,
): GanttRowMetrics {
  const fallback = COVERAGE_FALLBACK_ROW_H[coverage];
  const roomBand =
    availableHeightPx != null && availableHeightPx > 0
      ? Math.max(0, availableHeightPx - reservedHeightPx)
      : null;
  const raw =
    roomBand != null ? Math.floor(roomBand / coverage) : fallback;
  const rowH = Math.max(GANTT_ROW_H_MIN, raw);
  const stayH = Math.max(16, Math.round(rowH * 0.68));
  const occH = Math.max(14, Math.round(rowH * 0.54));
  const unassignedH = Math.max(20, Math.round(rowH * 0.78));
  return {
    rowH,
    stayH,
    stayTop: ganttBarTop(rowH, stayH),
    occH,
    occTop: ganttBarTop(rowH, occH),
    unassignedH,
  };
}

export function ganttRowMetricsStyle(metrics: GanttRowMetrics): Record<string, string> {
  return {
    "--gantt-row-h": `${metrics.rowH}px`,
    "--gantt-stay-h": `${metrics.stayH}px`,
    "--gantt-stay-top": `${metrics.stayTop}px`,
    "--gantt-occ-bar-h": `${metrics.occH}px`,
    "--gantt-occ-bar-top": `${metrics.occTop}px`,
    "--gantt-unassigned-row-h": `${metrics.unassignedH}px`,
  };
}
