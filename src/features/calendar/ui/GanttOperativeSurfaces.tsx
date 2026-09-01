"use client";

import dynamic from "next/dynamic";
import { GanttContextMenuPanel } from "@/features/calendar/ui/GanttContextMenuPanel";
import {
  useGanttOperativeCheck,
} from "@/features/calendar/ui/GanttOperativeCheckProvider";
import type { GanttOpsPickerMode } from "@/features/calendar/ui/GanttOpsPickerPanel";
import type { BookingRow } from "@/services/bookings";

const GanttOpsPickerPanel = dynamic(
  () =>
    import("@/features/calendar/ui/GanttOpsPickerPanel").then((m) => ({
      default: m.GanttOpsPickerPanel,
    })),
  { ssr: false }
);

export function GanttOperativeSurfaces({
  opsPickerMode,
  setOpsPickerMode,
  activeBookings,
  today,
}: {
  opsPickerMode: GanttOpsPickerMode | null;
  setOpsPickerMode: (mode: GanttOpsPickerMode | null) => void;
  activeBookings: BookingRow[];
  today: string;
}) {
  const { requestCheckIn, requestCheckOut } = useGanttOperativeCheck();

  return (
    <>
      <GanttContextMenuPanel />
      <GanttOpsPickerPanel
        open={opsPickerMode !== null}
        mode={opsPickerMode ?? "checkin"}
        bookings={activeBookings}
        onClose={() => setOpsPickerMode(null)}
        today={today}
        onSelect={(b) => {
          if (!opsPickerMode) return;
          if (opsPickerMode === "checkin") {
            requestCheckIn({
              bookingId: b.id,
              guestName: b.guest_name,
              plannedCheckIn: b.check_in,
              plannedCheckOut: b.check_out,
              status: b.status,
              actualCheckInAt: b.actual_check_in_at,
              actualCheckOutAt: b.actual_check_out_at,
              today,
            });
            return;
          }
          requestCheckOut({
            bookingId: b.id,
            guestName: b.guest_name,
            plannedCheckIn: b.check_in,
            plannedCheckOut: b.check_out,
            actualCheckInAt: b.actual_check_in_at,
            actualCheckOutAt: b.actual_check_out_at,
            today,
          });
        }}
      />
    </>
  );
}
