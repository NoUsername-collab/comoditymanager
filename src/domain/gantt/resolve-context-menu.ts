import { findOccupancyConflicts } from "@/domain/occupancy/conflict";
import type { OccupancySegment } from "@/domain/occupancy/types";
import { dayIndexFromPointerX, intervalFromDayIndices } from "@/domain/gantt/drag-create";
import { findGanttRoomAtPoint } from "@/domain/gantt/room-at-point";

export const GANTT_CTX_STAY_SELECTOR = "[data-gantt-stay]";
export const GANTT_CTX_OCC_SELECTOR = "[data-gantt-occ]";

export function dayIndexAtGanttPoint(
  clientX: number,
  dayCount: number
): number | null {
  if (typeof document === "undefined" || dayCount <= 0) return null;
  const grid = document.querySelector(
    "[data-gantt-day-grid]"
  ) as HTMLElement | null;
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  return dayIndexFromPointerX(clientX, rect.left, rect.width, dayCount);
}

export function ganttRoomNameFromId(roomId: string): string | null {
  if (typeof document === "undefined") return null;
  const row = document.querySelector(
    `[data-gantt-room-row="${roomId}"]`
  ) as HTMLElement | null;
  return row?.dataset.ganttRoomName ?? null;
}

export function resolveGanttCreateContext(
  clientX: number,
  clientY: number,
  dayIsos: string[],
  occupancy: OccupancySegment[]
): {
  roomId: string | null;
  roomName: string | null;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
} {
  const dayCount = dayIsos.length;
  const dayIdx = dayIndexAtGanttPoint(clientX, dayCount) ?? 0;
  const interval =
    intervalFromDayIndices(dayIsos, dayIdx, dayIdx) ?? {
      checkIn: dayIsos[0] ?? "",
      checkOut: dayIsos[0] ?? "",
    };

  const roomId = findGanttRoomAtPoint(clientX, clientY);
  const roomName = roomId ? ganttRoomNameFromId(roomId) : null;

  const hasConflict =
    roomId != null
      ? findOccupancyConflicts(
          [roomId],
          interval.checkIn,
          interval.checkOut,
          occupancy
        ).length > 0
      : false;

  return {
    roomId,
    roomName,
    checkIn: interval.checkIn,
    checkOut: interval.checkOut,
    hasConflict,
  };
}

export function isGanttSpecialContextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest(GANTT_CTX_STAY_SELECTOR) ||
    target.closest(GANTT_CTX_OCC_SELECTOR)
  );
}
