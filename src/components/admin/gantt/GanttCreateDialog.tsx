"use client";

import { useState } from "react";
import type { BookingRow } from "@/services/bookings";
import {
  GanttQuickActionPanel,
  type GanttQuickCreateDraft,
  type GanttQuickPanelMode,
  type GanttQuickRoomOption,
} from "@/components/admin/gantt/GanttQuickActionPanel";

export type GanttCreateDraft = GanttQuickCreateDraft;

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
  const [mode, setMode] = useState<GanttQuickPanelMode>(
    draft?.initialMode ?? "pick"
  );

  function handleClose() {
    setMode("pick");
    onClose();
  }

  return (
    <GanttQuickActionPanel
      key={
        draft
          ? `${draft.roomId}:${draft.checkIn}:${draft.checkOut}:${draft.initialMode ?? "pick"}`
          : "gantt-create-empty"
      }
      mode={draft ? mode : null}
      rooms={rooms}
      bookings={bookings}
      draft={draft}
      onClose={handleClose}
      onModeChange={setMode}
    />
  );
}
