"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  completeBookingCheckoutAction,
  editBookingCheckOutAction,
  loadBookingCheckoutPanelAction,
} from "@/app/[locale]/admin/(panel)/bookings/actions";
import {
  isEarlyDeparture,
  isLateCheckout,
  shouldBlockCheckoutForUnpaid,
} from "@/domain/booking/checkout-readiness";
import type { BookingCheckoutPanelData } from "@/domain/booking/checkout-panel";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { datetimeLocalNow, isoToDatetimeLocal } from "@/lib/operational-check";
import { stayNightCount } from "@/lib/stay-dates";
import {
  GuestStayRatingFields,
  type GuestStayRatingValue,
} from "@/components/admin/guests/GuestStayRatingFields";
import "@/app/admin/booking-checkout-panel.css";

export type BookingCheckoutPanelProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingId: string;
  intent?: "set" | "edit";
  guestName?: string;
  plannedCheckIn?: string;
  plannedCheckOut?: string;
  actualCheckOutAt?: string | null;
};

export function BookingCheckoutPanel({
  open,
  onClose,
  onSuccess,
  bookingId,
  intent = "set",
  guestName: guestNameProp,
  plannedCheckIn: plannedCheckInProp,
  plannedCheckOut: plannedCheckOutProp,
  actualCheckOutAt = null,
}: BookingCheckoutPanelProps) {
  const t = useTranslations("admin.checkout");
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt.checkTime");
  const tGanttCommon = useTranslations("admin.gantt");
  const locale = useLocale();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookingCheckoutPanelData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [atLocal, setAtLocal] = useState(datetimeLocalNow);
  const [addReview, setAddReview] = useState(false);
  const [reviewRating, setReviewRating] = useState<GuestStayRatingValue>({
    polarity: null,
    intensity: 3,
    note: "",
  });

  const isEdit = intent === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setAtLocal(
        actualCheckOutAt ? isoToDatetimeLocal(actualCheckOutAt) : datetimeLocalNow()
      );
      setData(null);
      setLoadError(null);
      setAddReview(false);
      setReviewRating({ polarity: null, intensity: 3, note: "" });
      return;
    }
    setAtLocal(datetimeLocalNow());

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void loadBookingCheckoutPanelAction(bookingId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error);
        setData(null);
        return;
      }
      setData(res.data);
      if (res.data.existingReviewStars != null) {
        setAddReview(true);
      }
      if (res.data.existingReviewNote?.trim()) {
        setReviewRating({
          polarity: res.data.existingReviewPolarity ?? "positive",
          intensity: res.data.existingReviewIntensity ?? 3,
          note: res.data.existingReviewNote,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, bookingId, isEdit, actualCheckOutAt]);

  const displayName = data?.guestName ?? guestNameProp ?? "";
  const plannedCheckIn = data?.plannedCheckIn ?? plannedCheckInProp ?? "";
  const plannedCheckOut = data?.plannedCheckOut ?? plannedCheckOutProp ?? "";
  const nights =
    plannedCheckIn && plannedCheckOut
      ? stayNightCount(plannedCheckIn, plannedCheckOut)
      : 0;

  const paymentBlocked = useMemo(() => {
    if (!data || isEdit) return false;
    return shouldBlockCheckoutForUnpaid(
      { checkout_block_unpaid: data.checkoutBlockUnpaid },
      data.paymentStatus
    );
  }, [data, isEdit]);

  const lateNote = useMemo(() => {
    if (!data?.checkoutTimeUntil || isEdit) return false;
    return isLateCheckout(atLocal, {
      checkout_time_until: data.checkoutTimeUntil,
    });
  }, [atLocal, data, isEdit]);

  const earlyNote = useMemo(() => {
    if (!data?.plannedCheckOut || isEdit) return false;
    return isEarlyDeparture(atLocal, data.plannedCheckOut, {
      checkout_time_until: data.checkoutTimeUntil,
    });
  }, [atLocal, data, isEdit]);

  const paymentLabel = useMemo(() => {
    if (!data?.paymentStatus) return t("paymentUnknown");
    if (data.paymentStatus === "paid") return t("paymentPaid");
    if (data.paymentStatus === "partial") {
      return t("paymentPartial", {
        paid: data.paymentAmountPaid,
        total: data.totalPrice ?? 0,
      });
    }
    return t("paymentUnpaid");
  }, [data, t]);

  function submit(at?: string) {
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("id", bookingId);
      if (at) fd.set("at", at);
      if (!isEdit && addReview && data?.guestId && reviewRating.polarity) {
        const note = reviewRating.note.trim();
        if (note) {
          fd.set("add_review", "1");
          fd.set("guest_id", data.guestId);
          fd.set("review_polarity", reviewRating.polarity);
          fd.set("review_intensity", String(reviewRating.intensity));
          fd.set("review_note", note);
        }
      }

      const res = isEdit
        ? await editBookingCheckOutAction(fd)
        : await completeBookingCheckoutAction(fd);

      if (!res.ok) {
        showToast({
          kind: "error",
          title: tCommon("error"),
          message: res.error,
        });
        return;
      }

      showToast({
        kind: "success",
        title: isEdit ? tGantt("checkOutRecorded") : t("successTitle"),
        message: displayName,
      });
      onClose();
      onSuccess?.();
    });
  }

  if (!open) return null;

  const title = isEdit ? t("editTitle") : t("title");
  const submitDisabled =
    pending || loading || (!isEdit && !!loadError) || paymentBlocked;

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={title}
      variant="modal"
      width={420}
      className="booking-checkout-panel"
    >
      <div className="booking-checkout-panel__body">
        <header className="booking-checkout-panel__hero">
          <p className="booking-checkout-panel__guest">{displayName}</p>
          {plannedCheckIn && plannedCheckOut ? (
            <p className="booking-checkout-panel__period">
              {formatStayPeriod(plannedCheckIn, plannedCheckOut, locale, true)}
              {nights > 0 ? ` · ${t("nights", { count: nights })}` : ""}
            </p>
          ) : null}
          {data?.roomNames.length ? (
            <p className="booking-checkout-panel__rooms">
              {data.roomNames.join(" · ")}
            </p>
          ) : null}
        </header>

        {loading ? (
          <p className="booking-checkout-panel__muted">{tCommon("loading")}</p>
        ) : null}

        {loadError ? (
          <p className="booking-checkout-panel__alert booking-checkout-panel__alert--error">
            {loadError}
          </p>
        ) : null}

        {!isEdit && data && paymentBlocked ? (
          <p className="booking-checkout-panel__alert booking-checkout-panel__alert--block">
            {t("unpaidBlock")}
          </p>
        ) : null}

        {!isEdit && data && !paymentBlocked && data.paymentStatus !== "paid" ? (
          <p className="booking-checkout-panel__alert booking-checkout-panel__alert--warn">
            {paymentLabel}
          </p>
        ) : null}

        {earlyNote ? (
          <p className="booking-checkout-panel__alert booking-checkout-panel__alert--early">
            {data?.earlyCheckoutAllowed === false
              ? t("earlyNotAllowed", {
                  until: data?.checkoutTimeUntil ?? "",
                })
              : (data?.earlyCheckoutFee ?? 0) > 0
                ? t("earlyNoteFee", {
                    until: data?.checkoutTimeUntil ?? "",
                    fee: data?.earlyCheckoutFee ?? 0,
                  })
                : t("earlyNote", { until: data?.checkoutTimeUntil ?? "" })}
          </p>
        ) : null}

        {lateNote ? (
          <p className="booking-checkout-panel__alert booking-checkout-panel__alert--note">
            {t("lateNote", { until: data?.checkoutTimeUntil ?? "" })}
          </p>
        ) : null}

        <section className="booking-checkout-panel__section">
          <h3 className="booking-checkout-panel__section-title">
            {tGantt("dateTime")}
          </h3>
          <input
            type="datetime-local"
            className="booking-checkout-panel__input"
            value={atLocal}
            onChange={(e) => setAtLocal(e.target.value)}
            disabled={submitDisabled}
          />
        </section>

        {!isEdit && data?.guestId ? (
          <section className="booking-checkout-panel__section">
            <label className="booking-checkout-panel__review-toggle">
              <input
                type="checkbox"
                checked={addReview}
                onChange={(e) => setAddReview(e.target.checked)}
                disabled={submitDisabled}
              />
              <span>{t("addReview")}</span>
            </label>

            {addReview ? (
              <div className="booking-checkout-panel__review-fields">
                <GuestStayRatingFields
                  mode="controlled"
                  value={reviewRating}
                  onChange={setReviewRating}
                  disabled={submitDisabled}
                  textareaClassName="booking-checkout-panel__textarea"
                />
                <Link
                  href={`/admin/guests/${data.guestId}`}
                  className="booking-checkout-panel__profile-link"
                >
                  {t("openGuestProfile")}
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="booking-checkout-panel__actions">
          <button
            type="button"
            className="booking-checkout-panel__btn booking-checkout-panel__btn--primary"
            disabled={submitDisabled}
            onClick={() => submit(atLocal)}
          >
            {pending ? tCommon("saving") : isEdit ? tCommon("save") : t("confirm")}
          </button>
          {!isEdit ? (
            <button
              type="button"
              className="booking-checkout-panel__btn booking-checkout-panel__btn--secondary"
              disabled={submitDisabled}
              onClick={() => submit()}
            >
              {tGanttCommon("now")}
            </button>
          ) : null}
          <button
            type="button"
            className="booking-checkout-panel__btn booking-checkout-panel__btn--ghost"
            disabled={pending}
            onClick={onClose}
          >
            {tCommon("cancel")}
          </button>
        </div>
      </div>
    </AdminFloatingPanel>
  );
}
