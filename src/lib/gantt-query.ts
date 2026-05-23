import type { GanttFilter } from "@/domain/gantt/filters";
import type { GanttZoom } from "@/domain/gantt/view-range";

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
  }
): string {
  const p = new URLSearchParams();
  p.set("y", String(base.y));
  p.set("m", String(base.m));
  if (base.view) p.set("view", base.view);
  if (base.building) p.set("building", base.building);
  if (base.room) p.set("room", base.room);
  if (base.zoom && base.zoom !== "month") p.set("zoom", base.zoom);
  if (base.ws) p.set("ws", base.ws);
  if (base.q !== undefined && base.zoom === "quarter") {
    p.set("q", String(base.q));
  }
  if (base.filter && base.filter !== "all") p.set("filter", base.filter);
  return p.toString();
}
