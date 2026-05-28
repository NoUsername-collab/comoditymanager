"use client";

import { useRouter } from "@/i18n/navigation";
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
} from "@/app/[locale]/admin/(panel)/bookings/actions";
import { formatOperationalTimestamp } from "@/lib/operational-check";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
  guestName: string;
  guestPhone?: string | null;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
};

export function BookingOperationalPanel({
  bookingId,
  guestName,
  guestPhone,
  plannedCheckIn,
  plannedCheckOut,
  actualCheckInAt,
  actualCheckOutAt,
}: Props) {
  const router = useRouter();
  const t = useTranslations("admin.operational");
  const tCommon = useTranslations("common");
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [dialogMode, setDialogMode] = useState<"checkin" | "checkout" | null>(
    null
  );
  const hasPhone = isValidGuestPhone(guestPhone);
  const checkInBlockedTitle = !hasPhone ? t("phoneRequiredForCheckIn") : "";

  function undoCheckIn() {
    if (!confirm(t("confirmUndoCheckIn"))) return;
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      const res = await undoBookingCheckInAction(fd);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      showToast({ kind: "success", title: t("undoCheckInSuccess"), message: guestName });
      router.refresh();
    });
  }

  function undoCheckOut() {
    if (!confirm(t("confirmUndoCheckOut"))) return;
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      const res = await undoBookingCheckOutAction(fd);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      showToast({ kind: "success", title: t("undoCheckOutSuccess"), message: guestName });
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-3 border border-emerald-200 bg-emerald-50/60 p-4">
      <h2 className="font-bold text-emerald-950">{t("title")}</h2>
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="font-semibold text-emerald-900">{t("checkInLabel")}</dt>
          <dd>
            {actualCheckInAt
              ? formatOperationalTimestamp(actualCheckInAt)
              : t("notRecorded")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-emerald-900">{t("checkOutLabel")}</dt>
          <dd>
            {actualCheckOutAt
              ? formatOperationalTimestamp(actualCheckOutAt)
              : t("notRecorded")}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {!actualCheckInAt && (
          <button
            type="button"
            className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            disabled={pending || !hasPhone}
            title={checkInBlockedTitle}
            onClick={() => setDialogMode("checkin")}
          >
            {t("checkInAction")}
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
              {t("checkOutAction")}
            </button>
            <button
              type="button"
              className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
              disabled={pending}
              onClick={undoCheckIn}
            >
              {t("undoCheckIn")}
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
            {t("undoCheckOut")}
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
