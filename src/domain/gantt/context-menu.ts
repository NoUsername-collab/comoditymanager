import type { GanttCreateDraft } from "@/components/admin/gantt/GanttCreateDialog";
import type { MoveRoomDraft } from "@/components/admin/gantt/MoveRoomDialog";
import type { GanttStayPopoverData } from "@/components/admin/gantt/GanttStayPopover";
import type { OccupancySegment } from "@/domain/occupancy/types";

export type GanttContextMenuPoint = {
  clientX: number;
  clientY: number;
};

export type GanttEmptyCellTarget = GanttContextMenuPoint & {
  kind: "empty";
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
};

export type GanttStayTarget = GanttContextMenuPoint & {
  kind: "stay";
  bookingId: string;
  guestId: string | null;
  guestName: string;
  status: "cerere_noua" | "confirmata";
  canMoveRoom: boolean;
  moveRoomDraft: MoveRoomDraft | null;
  popover: GanttStayPopoverData;
};

export type GanttOccTarget = GanttContextMenuPoint & {
  kind: "hold" | "block";
  segment: OccupancySegment;
  roomName: string;
};

export type GanttContextMenuTarget =
  | GanttEmptyCellTarget
  | GanttStayTarget
  | GanttOccTarget;

export type GanttCreateDraftRequest = GanttCreateDraft & {
  initialMode?: "hold" | "block" | "cerere" | "direct";
};

export const LONG_PRESS_MS = 400;
export const LONG_PRESS_MOVE_PX = 10;
