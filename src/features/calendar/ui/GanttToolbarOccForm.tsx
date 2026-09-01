"use client";

import type { BookingRow } from "@/services/bookings";
import {
  GanttQuickActionPanel,
  type GanttQuickPanelMode,
  type GanttQuickRoomOption,
} from "@/features/calendar/ui/GanttQuickActionPanel";

type Props = {
  mode: Exclude<GanttQuickPanelMode, "pick"> | null;
  rooms: GanttQuickRoomOption[];
  bookings: BookingRow[];
  onClose: () => void;
  today?: string;
};

export function GanttToolbarOccForm({
  mode,
  rooms,
  bookings,
  onClose,
  today,
}: Props) {
  return (
    <GanttQuickActionPanel
      mode={mode}
      rooms={rooms}
      bookings={bookings}
      onClose={onClose}
      today={today}
    />
  );
}
