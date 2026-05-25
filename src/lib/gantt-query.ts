import type { GanttFilter } from "@/domain/gantt/filters";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import type { GanttLayerFilter } from "@/domain/gantt/occupancy-layer";
import type { GanttZoom } from "@/domain/gantt/view-range";

export function parseGanttFeatureFilter(
  raw: string | undefined
): GanttFeatureFilter {
  if (raw === "ac" || raw === "fridge") return raw;
  return "all";
}

export function parseGanttFilter(raw: string | undefined): GanttFilter {
  if (raw === "occupied" || raw === "free") return raw;
  return "all";
}

export function buildCalendarQuery(
  base: {
    y: number;
    m: number;
    view?: string;
    building?: string;
    room?: string;
    zoom?: GanttZoom;
    ws?: string;
    q?: number;
    filter?: GanttFilter;
    layer?: GanttLayerFilter;
    feat?: GanttFeatureFilter;
    fd?: string;
  }
): string {
  const p = new URLSearchParams();
  p.set("y", String(base.y));
  p.set("m", String(base.m));
  if (base.view) p.set("view", base.view);
  if (base.building) p.set("building", base.building);
  if (base.room) p.set("room", base.room);
  if (base.zoom) p.set("zoom", base.zoom);
  if (base.ws) p.set("ws", base.ws);
  if (base.q !== undefined && base.zoom === "quarter") {
    p.set("q", String(base.q));
  }
  if (base.filter && base.filter !== "all") p.set("filter", base.filter);
  if (base.layer && base.layer !== "all") p.set("layer", base.layer);
  if (base.feat && base.feat !== "all") p.set("feat", base.feat);
  if (base.fd) p.set("fd", base.fd);
  return p.toString();
}
