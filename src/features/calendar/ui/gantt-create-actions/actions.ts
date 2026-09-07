import type {
  GanttCreateDraftRequest,
  GanttCreateTarget,
} from "@/domain/gantt/context-menu";

export const GANTT_CREATE_ACTION_IDS = [
  "cerere",
  "direct",
  "hold",
  "block",
] as const;

export type GanttCreateActionId = (typeof GANTT_CREATE_ACTION_IDS)[number];

export type GanttCreateActionDisabled = Record<GanttCreateActionId, boolean>;

export function ganttCreateActionsDisabled(
  menu: Pick<GanttCreateTarget, "roomId" | "roomIds" | "hasConflict">,
  pending: boolean
): GanttCreateActionDisabled {
  const isMultiRoom = (menu.roomIds?.length ?? 0) > 1;
  const blocked = !menu.roomId || pending || menu.hasConflict;
  return {
    cerere: blocked,
    direct: blocked,
    hold: blocked,
    block: blocked || isMultiRoom,
  };
}

export function ganttCreateDraftFromMenu(
  menu: GanttCreateTarget,
  mode: GanttCreateActionId,
  fallbackRoomName: string
): GanttCreateDraftRequest | null {
  if (!menu.roomId) return null;
  return {
    roomId: menu.roomId,
    ...(menu.roomIds ? { roomIds: menu.roomIds } : {}),
    roomName: menu.roomName ?? fallbackRoomName,
    checkIn: menu.checkIn,
    checkOut: menu.checkOut,
    hasConflict: menu.hasConflict,
    initialMode: mode,
  };
}
