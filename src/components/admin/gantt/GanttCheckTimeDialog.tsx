"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";
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
  const { compactChrome } = useCompactLayoutHints();
  const dialogRef = useRef<HTMLDivElement>(null);
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
    const raf = requestAnimationFrame(() => {
      const input = dialogRef.current?.querySelector<HTMLInputElement>(
        'input[type="datetime-local"]'
      );
      input?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
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
        ref={dialogRef}
        className={[
          "gantt-check-time-dialog fixed left-1/2 top-1/2 w-[min(22rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-4 shadow-xl",
          compactChrome && "gantt-check-time-dialog--sheet",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-labelledby="gantt-check-time-title"
        aria-describedby="gantt-check-time-planned"
      >
        <h2 id="gantt-check-time-title" className="text-sm font-bold">
          {title}
        </h2>
        <p className="mt-1 text-xs opacity-80">{guestName}</p>
        <p id="gantt-check-time-planned" className="mt-0.5 text-[11px] opacity-65">
          {tGantt("checkTime.planned")}:{" "}
          {formatStayPeriod(plannedCheckIn, plannedCheckOut, locale, true)}
        </p>

        {mode === "checkin" && intent === "set" && !checkInAllowed && (
          <p
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            role="alert"
            aria-live="polite"
          >
            {tServer("checkInOnlyOnArrivalDay")}
          </p>
        )}

        <label className="mt-4 block text-xs font-semibold">
          {tGantt("checkTime.dateTime")}
          <AdminInput
            type="datetime-local"
            value={atLocal}
            onChange={(e) => setAtLocal(e.target.value)}
            min={datetimeBounds?.min}
            max={datetimeBounds?.max}
            fieldSize="sm"
            className="mt-1"
            disabled={pending || (mode === "checkin" && intent === "set" && !checkInAllowed)}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <AdminButton
            variant="primary"
            size="sm"
            disabled={submitDisabled}
            onClick={() => submit(atLocal)}
          >
            {pending ? tCommon("saving") : cta}
          </AdminButton>
          <AdminButton
            variant="secondary"
            size="sm"
            disabled={submitDisabled}
            onClick={() => submit()}
          >
            {tCommon("now")}
          </AdminButton>
          <AdminButton
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onClose}
          >
            {tCommon("cancel")}
          </AdminButton>
        </div>
      </div>
    </AdminPortal>
  );
}
