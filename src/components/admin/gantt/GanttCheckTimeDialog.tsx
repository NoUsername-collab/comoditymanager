"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  editBookingCheckInAction,
  editBookingCheckOutAction,
  setBookingCheckInAction,
  setBookingCheckOutAction,
} from "@/app/[locale]/admin/(panel)/bookings/actions";
import {
  canOfferOperativeCheckIn,
  isOperativeCheckInTimestampValid,
  operativeCheckInDatetimeBounds,
} from "@/domain/booking/operative-checkin";
import { datetimeLocalNow } from "@/lib/operational-check";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { todayIso } from "@/lib/stay-dates";

export type GanttCheckTimeDialogProps = {
  open: boolean;
  mode: "checkin" | "checkout";
  intent?: "set" | "edit";
  bookingId: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  today?: string;
  status?: string;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function GanttCheckTimeDialog({
  open,
  mode,
  intent = "set",
  bookingId,
  guestName,
  plannedCheckIn,
  plannedCheckOut,
  today: todayProp,
  status = "confirmata",
  actualCheckInAt = null,
  actualCheckOutAt = null,
  onClose,
  onSuccess,
}: GanttCheckTimeDialogProps) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const tServer = useTranslations("admin.serverActions");
  const locale = useLocale();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [atLocal, setAtLocal] = useState(datetimeLocalNow);

  const effectiveToday = todayProp ?? todayIso();

  const checkInAllowed = useMemo(
    () =>
      mode !== "checkin" ||
      intent === "edit" ||
      canOfferOperativeCheckIn({
        status,
        plannedCheckIn,
        today: effectiveToday,
        actualCheckInAt,
        actualCheckOutAt,
      }),
    [
      mode,
      intent,
      status,
      plannedCheckIn,
      effectiveToday,
      actualCheckInAt,
      actualCheckOutAt,
    ]
  );

  const datetimeBounds = useMemo(
    () =>
      mode === "checkin" && intent === "set"
        ? operativeCheckInDatetimeBounds(plannedCheckIn)
        : null,
    [mode, intent, plannedCheckIn]
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "checkin" && intent === "set" && datetimeBounds) {
      const now = datetimeLocalNow();
      const inBounds =
        now >= datetimeBounds.min && now <= datetimeBounds.max;
      setAtLocal(inBounds ? now : `${plannedCheckIn}T12:00`);
      return;
    }
    setAtLocal(datetimeLocalNow());
  }, [open, bookingId, mode, intent, plannedCheckIn, datetimeBounds]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("admin-modal-open");
    return () => {
      document.documentElement.classList.remove("admin-modal-open");
    };
  }, [open]);

  if (!open) return null;

  const title =
    mode === "checkin"
      ? tGantt("checkTime.confirmCheckIn")
      : tGantt("checkTime.confirmCheckOut");
  const cta =
    mode === "checkin"
      ? tGantt("checkTime.confirmCheckIn")
      : tGantt("checkTime.confirmCheckOut");

  function submit(at?: string) {
    if (
      mode === "checkin" &&
      intent === "set" &&
      !isOperativeCheckInTimestampValid(plannedCheckIn, at)
    ) {
      showToast({
        kind: "error",
        title: tCommon("error"),
        message: tServer("checkInOnlyOnArrivalDay"),
      });
      return;
    }

    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      if (at) fd.set("at", at);

      const res =
        mode === "checkin"
          ? intent === "edit"
            ? await editBookingCheckInAction(fd)
            : await setBookingCheckInAction(fd)
          : intent === "edit"
            ? await editBookingCheckOutAction(fd)
            : await setBookingCheckOutAction(fd);

      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }

      showToast({
        kind: "success",
        title:
          mode === "checkin"
            ? tGantt("checkTime.checkInRecorded")
            : tGantt("checkTime.checkOutRecorded"),
        message: guestName,
      });
      onClose();
      onSuccess?.();
    });
  }

  const submitDisabled = pending || (mode === "checkin" && intent === "set" && !checkInAllowed);

  return (
    <AdminPortal>
      <button
        type="button"
        className="gantt-check-time-dialog__backdrop fixed inset-0 bg-black/40"
        aria-label={tCommon("close")}
        onClick={onClose}
      />
      <div
        className="gantt-check-time-dialog fixed left-1/2 top-1/2 w-[min(22rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-4 shadow-xl"
        role="dialog"
        aria-labelledby="gantt-check-time-title"
      >
        <h2 id="gantt-check-time-title" className="text-sm font-bold">
          {title}
        </h2>
        <p className="mt-1 text-xs opacity-80">{guestName}</p>
        <p className="mt-0.5 text-[11px] opacity-65">
          {tGantt("checkTime.planned")}:{" "}
          {formatStayPeriod(plannedCheckIn, plannedCheckOut, locale, true)}
        </p>

        {mode === "checkin" && intent === "set" && !checkInAllowed && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {tServer("checkInOnlyOnArrivalDay")}
          </p>
        )}

        <label className="mt-4 block text-xs font-semibold">
          {tGantt("checkTime.dateTime")}
          <input
            type="datetime-local"
            value={atLocal}
            onChange={(e) => setAtLocal(e.target.value)}
            min={datetimeBounds?.min}
            max={datetimeBounds?.max}
            className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
            disabled={pending || (mode === "checkin" && intent === "set" && !checkInAllowed)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            disabled={submitDisabled}
            onClick={() => submit(atLocal)}
          >
            {pending ? tCommon("saving") : cta}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            disabled={submitDisabled}
            onClick={() => submit()}
          >
            {tCommon("now")}
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs opacity-70"
            disabled={pending}
            onClick={onClose}
          >
            {tCommon("cancel")}
          </button>
        </div>
      </div>
    </AdminPortal>
  );
}
