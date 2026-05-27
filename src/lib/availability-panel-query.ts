import type { GanttFeatureFilter } from "@/domain/gantt/filters";

export type AvailabilityPanelView = "month" | "week";

export const AVAILABILITY_PANEL_OPEN_KEY = "avail";
export const AVAILABILITY_PANEL_QUERY_KEYS = {
  year: "avail_y",
  month: "avail_m",
  day: "avail_day",
  building: "avail_building",
  view: "avail_view",
  weekStart: "avail_ws",
  feature: "avail_feat",
} as const;

type Getter = (key: string) => string | null | undefined;

export function isAvailabilityPanelOpen(get: Getter): boolean {
  return get(AVAILABILITY_PANEL_OPEN_KEY) === "1";
}

export function readAvailabilityPanelState(
  get: Getter,
  defaults: {
    year: number;
    month: number;
    featureFilter?: GanttFeatureFilter;
  }
): {
  open: boolean;
  year: number;
  month: number;
  day: string | null;
  buildingId: string | null;
  view: AvailabilityPanelView;
  weekStart: string | null;
  featureFilter: GanttFeatureFilter;
} {
  const open = isAvailabilityPanelOpen(get);
  const year = Number(get(AVAILABILITY_PANEL_QUERY_KEYS.year)) || defaults.year;
  const month =
    get(AVAILABILITY_PANEL_QUERY_KEYS.month) != null
      ? Number(get(AVAILABILITY_PANEL_QUERY_KEYS.month))
      : defaults.month;
  const rawView = get(AVAILABILITY_PANEL_QUERY_KEYS.view);
  const rawFeat = get(AVAILABILITY_PANEL_QUERY_KEYS.feature);

  return {
    open,
    year,
    month: Number.isFinite(month) ? month : defaults.month,
    day: get(AVAILABILITY_PANEL_QUERY_KEYS.day) ?? null,
    buildingId: get(AVAILABILITY_PANEL_QUERY_KEYS.building) ?? null,
    view: rawView === "week" ? "week" : "month",
    weekStart: get(AVAILABILITY_PANEL_QUERY_KEYS.weekStart) ?? null,
    featureFilter: rawFeat === "ac" || rawFeat === "fridge" ? rawFeat : defaults.featureFilter ?? "all",
  };
}

export function mergeAvailabilityPanelSearch(
  base: URLSearchParams,
  patch: {
    open?: boolean;
    year?: number;
    month?: number;
    day?: string | null;
    buildingId?: string | null;
    view?: AvailabilityPanelView;
    weekStart?: string | null;
    featureFilter?: GanttFeatureFilter;
  }
): URLSearchParams {
  const next = new URLSearchParams(base.toString());

  if (patch.open === false) {
    next.delete(AVAILABILITY_PANEL_OPEN_KEY);
    Object.values(AVAILABILITY_PANEL_QUERY_KEYS).forEach((key) => next.delete(key));
    return next;
  }

  next.set(AVAILABILITY_PANEL_OPEN_KEY, "1");

  if (patch.year !== undefined) {
    next.set(AVAILABILITY_PANEL_QUERY_KEYS.year, String(patch.year));
  }
  if (patch.month !== undefined) {
    next.set(AVAILABILITY_PANEL_QUERY_KEYS.month, String(patch.month));
  }
  if (patch.day !== undefined) {
    if (patch.day) next.set(AVAILABILITY_PANEL_QUERY_KEYS.day, patch.day);
    else next.delete(AVAILABILITY_PANEL_QUERY_KEYS.day);
  }
  if (patch.buildingId !== undefined) {
    if (patch.buildingId) next.set(AVAILABILITY_PANEL_QUERY_KEYS.building, patch.buildingId);
    else next.delete(AVAILABILITY_PANEL_QUERY_KEYS.building);
  }
  if (patch.view !== undefined) {
    next.set(AVAILABILITY_PANEL_QUERY_KEYS.view, patch.view);
  }
  if (patch.weekStart !== undefined) {
    if (patch.weekStart) next.set(AVAILABILITY_PANEL_QUERY_KEYS.weekStart, patch.weekStart);
    else next.delete(AVAILABILITY_PANEL_QUERY_KEYS.weekStart);
  }
  if (patch.featureFilter !== undefined) {
    if (patch.featureFilter !== "all") {
      next.set(AVAILABILITY_PANEL_QUERY_KEYS.feature, patch.featureFilter);
    } else {
      next.delete(AVAILABILITY_PANEL_QUERY_KEYS.feature);
    }
  }

  return next;
}
