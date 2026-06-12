"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { BookingCheckoutPanel } from "@/components/admin/checkout/BookingCheckoutPanel";
import {
  undoBookingCheckInAction,
  undoBookingCheckOutAction,
} from "@/app/[locale]/admin/(panel)/bookings/actions";
import { formatOperationalTimestamp } from "@/lib/operational-check";
import {
  canOfferOperativeCheckIn,
  isOperativeCheckInDay,
} from "@/domain/booking/operative-checkin";
import {
  computeRoomCheckinProgress,
  shouldShowRoomCheckinProgress,
} from "@/domain/checkin/room-checkin-progress";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import { todayIso } from "@/lib/stay-dates";
import { CheckinWizardLauncher } from "@/components/admin/checkin/CheckinWizardLauncher";
import { TouristSheetLauncher } from "@/components/admin/checkin/TouristSheetLauncher";
import { StayCheckinProgress } from "@/components/admin/cazari/StayCheckinProgress";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
  guestName: string;
  guestPhone?: string | null;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  roomNames?: string[];
  checkedInRooms?: string[];
  keysHandedRooms?: string[];
  bookingForCheckin?: BookingForCheckin;
  checkinSettings?: CheckinSettings;
  hasCheckinRecord?: boolean;
};

export function BookingOperationalPanel({
  bookingId,
  guestName,
  guestPhone,
  plannedCheckIn,
  plannedCheckOut,
  actualCheckInAt,
  actualCheckOutAt,
  roomNames = [],
  checkedInRooms = [],
  keysHandedRooms = [],
  bookingForCheckin,
  checkinSettings,
  hasCheckinRecord = false,
}: Props) {
  const router = useRouter();
  const t = useTranslations("admin.operational");
  const tCheckIn = useTranslations("admin.checkIn");
  const tCazari = useTranslations("admin.pages.cazari");
  const tCommon = useTranslations("common");
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [checkoutPanel, setCheckoutPanel] = useState<{
    intent: "set" | "edit";
  } | null>(null);
  const [editCheckInOpen, setEditCheckInOpen] = useState(false);

  const hasPhone = isValidGuestPhone(guestPhone);
  const today = todayIso();
  const roomProgress = computeRoomCheckinProgress(roomNames, checkedInRooms);

  const canWizardCheckIn =
    canOfferOperativeCheckIn({
      status: "confirmata",
      plannedCheckIn,
      today,
      actualCheckInAt,
      actualCheckOutAt,
      hasCheckinRecord,
      roomNames,
      checkedInRooms,
    }) && hasPhone;

  const isArrivalDay = isOperativeCheckInDay(plannedCheckIn, today);
  const needsWizardForFisa =
    canWizardCheckIn && !!actualCheckInAt && !hasCheckinRecord;
  const canNewCheckIn = canWizardCheckIn && !actualCheckInAt;
  const canContinueRooms =
    canWizardCheckIn && roomProgress.isPartial && roomProgress.remaining > 0;
  const canEditCheckInTime =
    !!actualCheckInAt && hasCheckinRecord && roomProgress.isComplete;
  const checkInEnabled =
    canNewCheckIn ||
    canContinueRooms ||
    needsWizardForFisa ||
    canEditCheckInTime;

  const canCheckOut =
    !!actualCheckInAt && !actualCheckOutAt && roomProgress.isComplete;
  const canEditCheckOut = !!actualCheckOutAt;

  const checkInLabel = needsWizardForFisa
    ? tCazari("completeCheckinForFisa")
    : canEditCheckInTime
      ? `${tCommon("edit")} ${t("checkInLabel")}`
      : canContinueRooms
        ? roomProgress.remaining === 1
          ? tCazari("checkInNextRoom")
          : tCazari("checkInContinue")
        : tCheckIn("startCheckin");

  const checkInBlockedTitle = canEditCheckInTime
    ? ""
    : !hasPhone
      ? t("phoneRequiredForCheckIn")
      : !isArrivalDay && !canContinueRooms
        ? t("checkInOnlyOnArrivalDay", { date: plannedCheckIn })
        : "";

  const checkoutBlockedTitle = canEditCheckOut
    ? ""
    : actualCheckOutAt
      ? tCazari("checkoutAlreadyDone")
      : !actualCheckInAt
        ? tCazari("checkoutNeedsCheckin")
        : !roomProgress.isComplete
          ? tCazari("checkInContinue")
          : "";

  const canEmitFisa = hasCheckinRecord && roomProgress.isComplete;

  const checkInStepDone =
    roomProgress.isComplete || !!actualCheckInAt || roomProgress.checked > 0;
  const checkOutStepDone = !!actualCheckOutAt;
  const connectorDone = checkInStepDone && !actualCheckOutAt;

  function openCheckInWizard() {
    if (canEditCheckInTime) {
      setEditCheckInOpen(true);
      return;
    }
    if (!checkInEnabled) return;
    setCheckinModalOpen(true);
  }

  function openCheckOut() {
    if (canEditCheckOut) {
      setCheckoutPanel({ intent: "edit" });
      return;
    }
    if (!canCheckOut) return;
    setCheckoutPanel({ intent: "set" });
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

  const progressTitle = roomProgress.isComplete
    ? tCazari("checkinAllRoomsDone")
    : tCazari("checkinRoomsProgress", {
        checked: roomProgress.checked,
        total: roomProgress.total,
      });

  const showRoomProgress = shouldShowRoomCheckinProgress(
    plannedCheckIn,
    today,
    roomProgress,
  );

  return (
    <div className="bd-ops bd-ops--vertical">
      <p className="bd-card__title">{t("title")}</p>

      <div className="bd-ops__timeline">
        {/* ── Check-in (sus) ── */}
        <section
          className={[
            "bd-ops__lane",
            checkInStepDone && "bd-ops__lane--done",
            roomProgress.isPartial && "bd-ops__lane--partial",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="bd-ops__lane-head">
            <span className="bd-ops__lane-dot" aria-hidden />
            <div className="bd-ops__lane-meta">
              <p className="bd-ops__lane-label">{t("checkInLabel")}</p>
              <p className="bd-ops__lane-value">
                {actualCheckInAt
                  ? formatOperationalTimestamp(actualCheckInAt)
                  : t("notRecorded")}
              </p>
            </div>
            {canEditCheckInTime ? (
              <button
                type="button"
                className="bd-ops__lane-edit"
                disabled={pending}
                onClick={() => setEditCheckInOpen(true)}
              >
                {tCommon("edit")}
              </button>
            ) : null}
          </div>

          {showRoomProgress ? (
            <div className="bd-ops__progress">
              <StayCheckinProgress
                roomNames={roomNames}
                checkedInRooms={checkedInRooms}
                keysHandedRooms={keysHandedRooms}
                isConfirmed
                progressTitle={progressTitle}
                labels={{
                  roomChecked: tCazari("checkinRoomChecked"),
                  roomPending: tCazari("checkinRoomPending"),
                  roomKeyHanded: tCazari("checkinRoomKeyHanded"),
                  allRoomsDone: tCazari("checkinAllRoomsDone"),
                  partialHint: tCazari("checkinPartialHint"),
                }}
              />
            </div>
          ) : null}

          <div className="bd-ops__lane-actions">
            {(canWizardCheckIn || canEditCheckInTime) && !actualCheckOutAt && (
              <button
                type="button"
                className={[
                  "bd-ops__btn bd-ops__btn--primary checkin-start-btn",
                  canContinueRooms && "checkin-start-btn--continue",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={pending || !checkInEnabled}
                title={checkInBlockedTitle}
                onClick={openCheckInWizard}
              >
                {!canEditCheckInTime && (
                  <span className="checkin-start-btn__icon" aria-hidden>
                    {canContinueRooms ? "🛏" : "🔑"}
                  </span>
                )}
                {checkInLabel}
              </button>
            )}
            {actualCheckInAt && !actualCheckOutAt && (
              <button
                type="button"
                className="bd-ops__btn bd-ops__btn--ghost"
                disabled={pending}
                onClick={undoCheckIn}
              >
                {t("undoCheckIn")}
              </button>
            )}
          </div>
        </section>

        <div
          className={[
            "bd-ops__connector",
            connectorDone && "bd-ops__connector--done",
            checkOutStepDone && "bd-ops__connector--complete",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden
        />

        {/* ── Check-out (jos) ── */}
        <section
          className={[
            "bd-ops__lane",
            "bd-ops__lane--checkout",
            checkOutStepDone && "bd-ops__lane--done",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="bd-ops__lane-head">
            <span className="bd-ops__lane-dot" aria-hidden />
            <div className="bd-ops__lane-meta">
              <p className="bd-ops__lane-label">{t("checkOutLabel")}</p>
              <p className="bd-ops__lane-value">
                {actualCheckOutAt
                  ? formatOperationalTimestamp(actualCheckOutAt)
                  : t("notRecorded")}
              </p>
            </div>
            {canEditCheckOut ? (
              <button
                type="button"
                className="bd-ops__lane-edit"
                disabled={pending}
                onClick={() => setCheckoutPanel({ intent: "edit" })}
              >
                {tCommon("edit")}
              </button>
            ) : null}
          </div>

          <div className="bd-ops__lane-actions">
            {(canCheckOut || canEditCheckOut) && (
              <button
                type="button"
                className={[
                  "bd-ops__btn",
                  canCheckOut ? "bd-ops__btn--primary" : "bd-ops__btn--ghost",
                ].join(" ")}
                disabled={pending || (!canCheckOut && !canEditCheckOut)}
                title={checkoutBlockedTitle}
                onClick={openCheckOut}
              >
                {canEditCheckOut
                  ? `${tCommon("edit")} ${t("checkOutLabel")}`
                  : t("checkOutAction")}
              </button>
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
        </section>
      </div>

      {canEmitFisa ? (
        <div className="bd-ops__footer">
          <TouristSheetLauncher
            bookingId={bookingId}
            label={tCazari("emitFisa")}
          />
        </div>
      ) : null}

      <CheckinWizardLauncher
        bookingId={bookingId}
        open={checkinModalOpen}
        booking={bookingForCheckin}
        settings={checkinSettings}
        onClose={() => setCheckinModalOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {checkoutPanel ? (
        <BookingCheckoutPanel
          open
          intent={checkoutPanel.intent}
          bookingId={bookingId}
          guestName={guestName}
          plannedCheckIn={plannedCheckIn}
          plannedCheckOut={plannedCheckOut}
          actualCheckOutAt={actualCheckOutAt}
          onClose={() => setCheckoutPanel(null)}
          onSuccess={() => {
            setCheckoutPanel(null);
            router.refresh();
          }}
        />
      ) : null}

      {editCheckInOpen ? (
        <GanttCheckTimeDialog
          open
          mode="checkin"
          intent="edit"
          bookingId={bookingId}
          guestName={guestName}
          plannedCheckIn={plannedCheckIn}
          plannedCheckOut={plannedCheckOut}
          actualCheckInAt={actualCheckInAt}
          actualCheckOutAt={actualCheckOutAt}
          onClose={() => setEditCheckInOpen(false)}
          onSuccess={() => {
            setEditCheckInOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
