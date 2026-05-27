"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import {
  undoBookingCheckInAction,
  undoBookingCheckOutAction,
} from "@/app/admin/(panel)/bookings/actions";
import { formatOperationalTimestamp } from "@/lib/operational-check";

type Props = {
  bookingId: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
};

export function BookingOperationalPanel({
  bookingId,
  guestName,
  plannedCheckIn,
  plannedCheckOut,
  actualCheckInAt,
  actualCheckOutAt,
}: Props) {
  const router = useRouter();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [dialogMode, setDialogMode] = useState<"checkin" | "checkout" | null>(
    null
  );

  function undoCheckIn() {
    if (!confirm("Anulezi check-in-ul înregistrat?")) return;
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      const res = await undoBookingCheckInAction(fd);
      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }
      showToast({ kind: "success", title: "Check-in anulat", message: guestName });
      router.refresh();
    });
  }

  function undoCheckOut() {
    if (!confirm("Anulezi check-out-ul înregistrat?")) return;
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      const res = await undoBookingCheckOutAction(fd);
      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }
      showToast({ kind: "success", title: "Check-out anulat", message: guestName });
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-3 border border-emerald-200 bg-emerald-50/60 p-4">
      <h2 className="font-bold text-emerald-950">Sosire / plecare (recepție)</h2>
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="font-semibold text-emerald-900">Check-in operațional</dt>
          <dd>
            {actualCheckInAt
              ? formatOperationalTimestamp(actualCheckInAt)
              : "Neînregistrat"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-emerald-900">Check-out operațional</dt>
          <dd>
            {actualCheckOutAt
              ? formatOperationalTimestamp(actualCheckOutAt)
              : "Neînregistrat"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {!actualCheckInAt && (
          <button
            type="button"
            className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            disabled={pending}
            onClick={() => setDialogMode("checkin")}
          >
            Check-in…
          </button>
        )}
        {actualCheckInAt && !actualCheckOutAt && (
          <>
            <button
              type="button"
              className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              disabled={pending}
              onClick={() => setDialogMode("checkout")}
            >
              Check-out…
            </button>
            <button
              type="button"
              className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
              disabled={pending}
              onClick={undoCheckIn}
            >
              Anulează check-in
            </button>
          </>
        )}
        {actualCheckOutAt && (
          <button
            type="button"
            className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            disabled={pending}
            onClick={undoCheckOut}
          >
            Anulează check-out
          </button>
        )}
      </div>

      <GanttCheckTimeDialog
        open={dialogMode !== null}
        mode={dialogMode ?? "checkin"}
        bookingId={bookingId}
        guestName={guestName}
        plannedCheckIn={plannedCheckIn}
        plannedCheckOut={plannedCheckOut}
        onClose={() => setDialogMode(null)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
