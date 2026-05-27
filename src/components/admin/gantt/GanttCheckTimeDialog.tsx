"use client";

import { useEffect, useState } from "react";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  setBookingCheckInAction,
  setBookingCheckOutAction,
} from "@/app/admin/(panel)/bookings/actions";
import { datetimeLocalNow } from "@/lib/operational-check";
import { formatStayPeriod } from "@/lib/ro-calendar";

export type GanttCheckTimeDialogProps = {
  open: boolean;
  mode: "checkin" | "checkout";
  bookingId: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function GanttCheckTimeDialog({
  open,
  mode,
  bookingId,
  guestName,
  plannedCheckIn,
  plannedCheckOut,
  onClose,
  onSuccess,
}: GanttCheckTimeDialogProps) {
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [atLocal, setAtLocal] = useState(datetimeLocalNow);

  useEffect(() => {
    if (open) setAtLocal(datetimeLocalNow());
  }, [open, bookingId, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const title = mode === "checkin" ? "Confirmă check-in" : "Confirmă check-out";
  const cta =
    mode === "checkin" ? "Confirmă check-in" : "Confirmă check-out";

  function submit(at?: string) {
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      if (at) fd.set("at", at);

      const res =
        mode === "checkin"
          ? await setBookingCheckInAction(fd)
          : await setBookingCheckOutAction(fd);

      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }

      showToast({
        kind: "success",
        title: mode === "checkin" ? "Check-in înregistrat" : "Check-out înregistrat",
        message: guestName,
      });
      onClose();
      onSuccess?.();
    });
  }

  return (
    <AdminPortal>
      <button
        type="button"
        className="fixed inset-0 z-[220] bg-black/40"
        aria-label="Închide"
        onClick={onClose}
      />
      <div
        className="admin-floating-panel fixed left-1/2 top-1/2 z-[221] w-[min(22rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
        role="dialog"
        aria-labelledby="gantt-check-time-title"
      >
        <h2 id="gantt-check-time-title" className="text-sm font-bold text-zinc-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-600">{guestName}</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Planificat: {formatStayPeriod(plannedCheckIn, plannedCheckOut, true)}
        </p>

        <label className="mt-4 block text-xs font-semibold text-zinc-800">
          Data și ora
          <input
            type="datetime-local"
            value={atLocal}
            onChange={(e) => setAtLocal(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            disabled={pending}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            disabled={pending}
            onClick={() => submit(atLocal)}
          >
            {pending ? "Se salvează…" : cta}
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 disabled:opacity-50"
            disabled={pending}
            onClick={() => submit()}
          >
            Acum
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs text-zinc-500"
            disabled={pending}
            onClick={onClose}
          >
            Anulează
          </button>
        </div>
      </div>
    </AdminPortal>
  );
}
