"use client";

import type { BookingRow } from "@/services/bookings";
import {
  GanttQuickActionPanel,
  type GanttQuickRoomOption,
} from "@/features/calendar/ui/GanttQuickActionPanel";
import type { GanttCreateDraft } from "@/domain/gantt/drafts";

export type { GanttCreateDraft };

type Props = {
  draft: GanttCreateDraft | null;
  rooms: GanttQuickRoomOption[];
  bookings?: BookingRow[];
  onClose: () => void;
};

export function GanttCreateDialog({
  draft,
  rooms,
  bookings = [],
  onClose,
}: Props) {
  if (!draft?.initialMode) return null;

  return (
    <GanttQuickActionPanel
      key={`${draft.roomId}:${draft.checkIn}:${draft.checkOut}:${draft.initialMode}`}
      mode={draft.initialMode}
      rooms={rooms}
      bookings={bookings}
      draft={draft}
      onClose={onClose}
    />
  );
}
