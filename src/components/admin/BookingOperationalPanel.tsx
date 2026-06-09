"use client";

import dynamic from "next/dynamic";
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
import { canOfferOperativeCheckIn } from "@/domain/booking/operative-checkin";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import { todayIso } from "@/lib/stay-dates";
import { useTranslations } from "next-intl";

const CheckinModal = dynamic(
  () =>
    import("@/components/admin/checkin/CheckinModal").then((m) => ({
      default: m.CheckinModal,
    })),
  { ssr: false }
);

type Props = {
  bookingId: string;
  guestName: string;
  guestPhone?: string | null;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  /** Full reception check-in wizard (identity → validate → payment → finish). */
  bookingForCheckin?: BookingForCheckin;
  checkinSettings?: CheckinSettings;
  hasExistingCheckin?: boolean;
};

export function BookingOperationalPanel({
  bookingId,
  guestName,
  guestPhone,
  plannedCheckIn,
  plannedCheckOut,
  actualCheckInAt,
  actualCheckOutAt,
  bookingForCheckin,
  checkinSettings,
  hasExistingCheckin = false,
}: Props) {
  const router = useRouter();
  const t = useTranslations("admin.operational");
  const tCheckIn = useTranslations("admin.checkIn");
  const tCommon = useTranslations("common");
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [dialogMode, setDialogMode] = useState<"checkin" | "checkout" | null>(
    null
  );
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const hasPhone = isValidGuestPhone(guestPhone);
  const today = todayIso();
  const canCheckIn = canOfferOperativeCheckIn({
    status: "confirmata",
    plannedCheckIn,
    today,
    actualCheckInAt,
    actualCheckOutAt,
  });
  const checkInBlockedTitle = !hasPhone
    ? t("phoneRequiredForCheckIn")
    : !canCheckIn
      ? t("checkInOnlyOnArrivalDay", { date: plannedCheckIn })
      : "";

  const useFullCheckinWizard =
    Boolean(bookingForCheckin && checkinSettings) &&
    !hasExistingCheckin &&
    canCheckIn;

  function openCheckIn() {
    if (useFullCheckinWizard) {
      setCheckinModalOpen(true);
      return;
    }
    setDialogMode("checkin");
  }

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

  // Determine visual step: 0 = waiting, 1 = checked-in, 2 = checked-out
  const step = actualCheckOutAt ? 2 : actualCheckInAt ? 1 : 0;

  return (
    <div className="bd-ops">
      <p className="bd-card__title">{t("title")}</p>

      {/* ── Step progress indicators ──────────────────────── */}
      <div className="bd-ops__steps">
        <div className={`bd-ops__step ${step >= 0 ? "bd-ops__step--active" : ""}`}>
          <span className="bd-ops__step-dot" />
          <span className="bd-ops__step-label">{t("checkInLabel")}</span>
          <span className="bd-ops__step-value">
            {actualCheckInAt ? formatOperationalTimestamp(actualCheckInAt) : "—"}
          </span>
        </div>
        <div className={`bd-ops__step-line ${step >= 1 ? "bd-ops__step-line--done" : ""}`} />
        <div className={`bd-ops__step ${step >= 2 ? "bd-ops__step--active" : ""}`}>
          <span className="bd-ops__step-dot" />
          <span className="bd-ops__step-label">{t("checkOutLabel")}</span>
          <span className="bd-ops__step-value">
            {actualCheckOutAt ? formatOperationalTimestamp(actualCheckOutAt) : "—"}
          </span>
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      <div className="bd-ops__actions">
        {canCheckIn && (
          <button
            type="button"
            className={[
              "bd-ops__btn bd-ops__btn--primary",
              useFullCheckinWizard && "checkin-start-btn",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={pending || !hasPhone}
            title={checkInBlockedTitle}
            onClick={openCheckIn}
          >
            {useFullCheckinWizard ? (
              <>
                <span className="checkin-start-btn__icon" aria-hidden>
                  🔑
                </span>
                {tCheckIn("startCheckin")}
              </>
            ) : (
              t("checkInAction")
            )}
          </button>
        )}
        {actualCheckInAt && !actualCheckOutAt && (
          <>
            <button
              type="button"
              className="bd-ops__btn bd-ops__btn--primary"
              disabled={pending}
              onClick={() => setDialogMode("checkout")}
            >
              {t("checkOutAction")}
            </button>
            <button
              type="button"
              className="bd-ops__btn bd-ops__btn--ghost"
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
            className="bd-ops__btn bd-ops__btn--ghost"
            disabled={pending}
            onClick={undoCheckOut}
          >
            {t("undoCheckOut")}
          </button>
        )}
      </div>

      {checkinModalOpen && bookingForCheckin && checkinSettings ? (
        <CheckinModal
          booking={bookingForCheckin}
          settings={checkinSettings}
          onClose={() => setCheckinModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      ) : null}

      <GanttCheckTimeDialog
        open={dialogMode !== null && !checkinModalOpen}
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
