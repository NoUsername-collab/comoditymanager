import type { AcMode } from "@/types/database";

/** Culoare marker sidebar Gantt — AC vs fără AC (nu paleta clădirii). */
export const GANTT_AC_MARKER_BLUE = "#2563eb";
export const GANTT_NO_AC_MARKER_ORANGE = "#ea580c";

export function ganttMarkerShowsAc(
  acMode: AcMode,
  opts?: { roomHasAc?: boolean; buildingHasAnyRoomAc?: boolean }
): boolean {
  if (acMode === "all_rooms") return true;
  if (acMode === "none") return false;
  if (opts?.roomHasAc != null) return opts.roomHasAc;
  return opts?.buildingHasAnyRoomAc === true;
}

export function ganttMarkerAcPartial(
  acMode: AcMode,
  opts?: { roomHasAc?: boolean; buildingHasAnyRoomAc?: boolean }
): boolean {
  return (
    acMode === "per_room" &&
    opts?.buildingHasAnyRoomAc === true &&
    opts?.roomHasAc == null
  );
}

export function resolveGanttAcMarkerColor(
  acMode: AcMode,
  opts?: { roomHasAc?: boolean; buildingHasAnyRoomAc?: boolean }
): string {
  return ganttMarkerShowsAc(acMode, opts)
    ? GANTT_AC_MARKER_BLUE
    : GANTT_NO_AC_MARKER_ORANGE;
}
