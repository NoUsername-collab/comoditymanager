"use client";

import type { BookingRow } from "@/services/bookings";
import {
  GanttQuickActionPanel,
  type GanttQuickPanelMode,
  type GanttQuickRoomOption,
} from "@/components/admin/gantt/GanttQuickActionPanel";

type Props = {
  mode: Exclude<GanttQuickPanelMode, "pick"> | null;
  rooms: GanttQuickRoomOption[];
  bookings: BookingRow[];
  onClose: () => void;
};

export function GanttToolbarOccForm({
  mode,
  rooms,
  bookings,
  onClose,
}: Props) {
  return (
    <GanttQuickActionPanel
      mode={mode}
      rooms={rooms}
      bookings={bookings}
      onClose={onClose}
    />
  );
}
