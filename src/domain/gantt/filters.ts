import { todayIso } from "@/lib/stay-dates";
import type { GanttRoom } from "@/domain/gantt/types";

export type GanttFilter = "all" | "occupied" | "free";

export type GanttFeatureFilter = "all" | "ac" | "fridge";

export function filterGanttRoomsByFeature(
  rooms: GanttRoom[],
  feature: GanttFeatureFilter
): GanttRoom[] {
  if (feature === "all") return rooms;
  return rooms.filter((room) => {
    const slugs = new Set(room.option_slugs ?? []);
    if (room.has_ac) slugs.add("ac");
    return slugs.has(feature);
  });
}

export function focusDayInRange(dayIsos: string[], today: string = todayIso()): string {
  if (dayIsos.includes(today)) return today;
  return dayIsos[Math.floor(dayIsos.length / 2)] ?? today;
}
