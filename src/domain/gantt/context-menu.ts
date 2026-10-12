import type {
  GanttCreateDraft,
  GanttStayPopoverData,
  MoveRoomDraft,
} from "@/domain/gantt/drafts";
import type { OccupancyPhase, OccupancySegment } from "@/domain/occupancy/types";

type GanttContextMenuPoint = {
  clientX: number;
  clientY: number;
};

export type GanttCreateTarget = GanttContextMenuPoint & {
  kind: "create";
  roomId: string | null;
  roomName: string | null;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
  roomIds?: string[];
};

type GanttStayTarget = GanttContextMenuPoint & {
  kind: "stay";
  bookingId: string;
  guestId: string | null;
  guestName: string;
  status: "cerere_noua" | "confirmata";
  occupancyPhase: OccupancyPhase;
  today: string;
  roomIds: string[];
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  plannedCheckIn: string;
  plannedCheckOut: string;
  canMoveRoom: boolean;
  moveRoomDraft: MoveRoomDraft | null;
  popover: GanttStayPopoverData;
};

type GanttOccTarget = GanttContextMenuPoint & {
  kind: "hold" | "block";
  segment: OccupancySegment;
  roomName: string;
};

export type GanttContextMenuTarget =
  | GanttCreateTarget
  | GanttStayTarget
  | GanttOccTarget;

export type GanttCreateDraftRequest = GanttCreateDraft & {
  initialMode?: "hold" | "block" | "request" | "direct";
};

export const LONG_PRESS_MS = 400;
export const LONG_PRESS_MOVE_PX = 10;
