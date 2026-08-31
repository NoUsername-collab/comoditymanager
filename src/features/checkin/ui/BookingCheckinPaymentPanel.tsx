"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { CheckinPaymentStep } from "@/features/checkin/ui/CheckinPaymentStep";
import {
  loadBookingCheckinPaymentPanelAction,
  updateCheckinPaymentAction,
} from "@/features/checkin/actions";
import {
  checkinPaymentBalance,
  isCheckinPaymentSettled,
} from "@/domain/checkin/payment-panel";
import type { BookingCheckinPaymentPanelData } from "@/domain/checkin/payment-panel";
import {
  paymentAmountForStatus,
  type PaymentStatus,
} from "@/domain/checkin/types";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { stayNightCount } from "@/lib/stay-dates";
import "@/styles/features/admin/booking-checkout-panel.css";

export type BookingCheckinPaymentPanelProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingId: string;
  guestName?: string;
  plannedCheckIn?: string;
  plannedCheckOut?: string;
};

export function BookingCheckinPaymentPanel({
  open,
  onClose,
  onSuccess,
  bookingId,
  guestName: guestNameProp,
  plannedCheckIn: plannedCheckInProp,
  plannedCheckOut: plannedCheckOutProp,
}: BookingCheckinPaymentPanelProps) {
  const t = useTranslations("admin.checkinPayment");
  const tCheckIn = useTranslations("admin.checkIn");
  const tCheckout = useTranslations("admin.checkout");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookingCheckinPaymentPanelData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setData(null);

    void loadBookingCheckinPaymentPanelAction(bookingId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setData(res.data);
      setPaymentStatus(res.data.paymentStatus);
      setPaymentAmount(res.data.paymentAmountPaid);
      setDepositAmount(res.data.depositAmount);
    });

    return () => {
      cancelled = true;
    };
  }, [open, bookingId]);

  const displayName = data?.guestName ?? guestNameProp ?? "";
  const plannedCheckIn = data?.plannedCheckIn ?? plannedCheckInProp ?? "";
  const plannedCheckOut = data?.plannedCheckOut ?? plannedCheckOutProp ?? "";
  const nights =
    plannedCheckIn && plannedCheckOut
      ? stayNightCount(plannedCheckIn, plannedCheckOut)
      : 0;

  const balance = useMemo(() => {
    if (!data) return 0;
    return checkinPaymentBalance(data.totalPrice, data.paymentAmountPaid);
  }, [data]);

  const paymentLabel = useMemo(() => {
    if (!data) return t("paymentUnknown");
    if (isCheckinPaymentSettled(data.paymentStatus, data.totalPrice)) {
      return t("paymentPaid");
    }
    if (data.paymentStatus === "partial") {
      return t("paymentPartial", {
        paid: data.paymentAmountPaid,
        total: data.totalPrice,
      });
    }
    return t("paymentUnpaid");
  }, [data, t]);

  function submit() {
    if (!data) return;
    void runAdminAction(async () => {
      const fd = new FormData();
      fd.set("checkin_id", data.checkinId);
      fd.set("booking_id", data.bookingId);
      fd.set("payment_status", paymentStatus);
      fd.set(
        "payment_amount_paid",
        String(
          paymentAmountForStatus(
            paymentStatus,
            data.totalPrice,
            paymentAmount,
          ),
        ),
      );
      fd.set("deposit_amount", String(depositAmount));

      const res = await updateCheckinPaymentAction(fd);
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
        title: t("successTitle"),
        message: displayName,
      });
      onClose();
      onSuccess?.();
    });
  }

  if (!open) return null;

  const settings = data?.settings;
  const bookingForCheckin = data?.bookingForCheckin;

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={t("title")}
      variant="modal"
      width={480}
      className="booking-checkout-panel booking-checkin-payment-panel"
    >
      <div className="booking-checkout-panel__body">
        <header className="booking-checkout-panel__hero">
          <p className="booking-checkout-panel__guest">{displayName}</p>
          {plannedCheckIn && plannedCheckOut ? (
            <p className="booking-checkout-panel__period">
              {formatStayPeriod(plannedCheckIn, plannedCheckOut, locale, true)}
              {nights > 0 ? ` · ${tCheckout("nights", { count: nights })}` : ""}
            </p>
          ) : null}
          {data && balance > 0 ? (
            <p className="booking-checkout-panel__alert booking-checkout-panel__alert--warn">
              {t("balanceDue", { amount: balance })}
            </p>
          ) : null}
          {data ? (
            <p className="booking-checkout-panel__meta">{paymentLabel}</p>
          ) : null}
        </header>

        {loading ? (
          <p className="booking-checkout-panel__loading">{tCommon("loading")}</p>
        ) : loadError ? (
          <p className="booking-checkout-panel__alert booking-checkout-panel__alert--error">
            {loadError}
          </p>
        ) : data && settings && bookingForCheckin ? (
          <CheckinPaymentStep
            booking={bookingForCheckin}
            settings={settings}
            paymentStatus={paymentStatus}
            paymentAmount={paymentAmount}
            depositAmount={depositAmount}
            onPaymentStatusChange={setPaymentStatus}
            onPaymentAmountChange={setPaymentAmount}
            onDepositAmountChange={setDepositAmount}
            t={tCheckIn}
          />
        ) : null}

        <div className="booking-checkout-panel__actions">
          <button
            type="button"
            className="booking-checkout-panel__btn booking-checkout-panel__btn--ghost"
            disabled={pending}
            onClick={onClose}
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="booking-checkout-panel__btn booking-checkout-panel__btn--primary"
            disabled={pending || loading || !!loadError || !data}
            onClick={submit}
          >
            {pending ? tCommon("loading") : t("confirm")}
          </button>
        </div>
      </div>
    </AdminFloatingPanel>
  );
}
