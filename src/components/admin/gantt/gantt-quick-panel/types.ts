import type { BookingRow } from "@/services/bookings";

export type GanttQuickRoomOption = {
  id: string;
  name: string;
  building_name: string;
};

export type GanttQuickCreateDraft = {
  roomId: string;
  roomIds?: string[];
  roomName: string;
  checkIn: string;
  checkOut: string;
  hasConflict: boolean;
  initialMode?: "hold" | "block" | "cerere" | "direct";
};

export type GanttQuickPanelMode =
  | "pick"
  | "hold"
  | "block"
  | "cerere"
  | "direct"
  | "move";

export type GanttQuickActionPanelProps = {
  mode: GanttQuickPanelMode | null;
  rooms: GanttQuickRoomOption[];
  bookings?: BookingRow[];
  draft?: GanttQuickCreateDraft | null;
  onClose: () => void;
  onModeChange?: (mode: GanttQuickPanelMode) => void;
  today?: string;
};

export const GANTT_QUICK_LABEL_CLASS =
  "admin-field__label block uppercase tracking-[0.08em]";
