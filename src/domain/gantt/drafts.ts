import type { GanttStayTimeline } from "@/domain/gantt/stay-card-display";

export type GanttCreateDraft = {
  roomId: string;
  roomIds?: string[];
  roomName: string;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
  initialMode?: "hold" | "block" | "cerere" | "direct";
};

export type MoveRoomDraft = {
  bookingId: string;
  guestName: string;
  sourceRoomId: string;
  sourceRoomName: string;
  roomIds: string[];
};

export type GanttStayPopoverData = {
  bookingId: string;
  guestName: string;
  label: string;
  checkIn: string;
  checkOut: string;
  /** Data reală de sosire a rezervării (nu segmentul vizibil pe timeline). */
  bookingCheckIn?: string;
  status: "cerere_noua" | "confirmata";
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  numAdults: number;
  numChildren: number;
  checkInTime: string;
  checkOutTime: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
  buildingColor?: string | null;
  roomId?: string;
  roomName?: string;
  roomNames?: string[];
  guestPhone?: string | null;
  totalPrice?: number | null;
  canMoveRoom?: boolean;
  onMoveRoom?: () => void;
  timeline?: GanttStayTimeline | null;
  showUnpaid?: boolean;
  showMissingIdentity?: boolean;
  keysHandedRooms?: string[];
};
