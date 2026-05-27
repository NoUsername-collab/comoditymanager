import type { GanttLayerFilter } from "@/domain/gantt/occupancy-layer";

export function ganttLayerMessageKey(layer: GanttLayerFilter): string {
  return layer;
}
