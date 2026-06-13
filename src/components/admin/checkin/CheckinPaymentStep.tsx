"use client";

import type { useTranslations } from "next-intl";
import {
  CHECKIN_PAYMENT_OPTIONS,
  paymentAmountForStatus,
  type BookingForCheckin,
  type CheckinSettings,
  type PaymentStatus,
} from "@/domain/checkin/types";

type Props = {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  depositAmount: number;
  onPaymentStatusChange: (v: PaymentStatus) => void;
  onPaymentAmountChange: (v: number) => void;
  onDepositAmountChange: (v: number) => void;
  t: ReturnType<typeof useTranslations>;
};

export function CheckinPaymentStep({
  booking,
  settings,
  paymentStatus,
  paymentAmount,
  depositAmount,
  onPaymentStatusChange,
  onPaymentAmountChange,
  onDepositAmountChange,
  t,
}: Props) {
  return (
    <div className="checkin-step-payment">
      <div className="checkin-payment__total">
        <span className="checkin-payment__total-label">{t("payment.totalDue")}</span>
        <span className="checkin-payment__total-value">{booking.total_price}</span>
      </div>

      <div className="checkin-payment__options">
        {CHECKIN_PAYMENT_OPTIONS.map((s) => (
          <label
            key={s}
            className={[
              "checkin-payment__option",
              s === "online" && "checkin-payment__option--online",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              type="radio"
              name="payment_status"
              value={s}
              checked={paymentStatus === s}
              onChange={() => {
                onPaymentStatusChange(s);
                onPaymentAmountChange(
                  paymentAmountForStatus(s, booking.total_price, paymentAmount),
                );
              }}
            />
            <span>{t(`payment.${s}`)}</span>
          </label>
        ))}
      </div>

      {paymentStatus === "online" && (
        <div className="checkin-payment__mock" role="status">
          <span className="checkin-payment__mock-icon" aria-hidden>
            💳
          </span>
          <div>
            <p className="checkin-payment__mock-title">{t("payment.onlineMockTitle")}</p>
            <p className="checkin-payment__mock-text">{t("payment.onlineMockHint")}</p>
          </div>
        </div>
      )}

      {paymentStatus === "partial" && (
        <label className="checkin-field">
          <span className="checkin-field__label">{t("payment.amountPaid")}</span>
          <input
            type="number"
            className="checkin-field__input"
            min={0}
            max={booking.total_price}
            value={paymentAmount}
            onChange={(e) => onPaymentAmountChange(Number(e.target.value))}
          />
        </label>
      )}

      {settings.checkin_deposit && (
        <label className="checkin-field">
          <span className="checkin-field__label">{t("payment.deposit")}</span>
          <input
            type="number"
            className="checkin-field__input"
            min={0}
            value={depositAmount}
            onChange={(e) => onDepositAmountChange(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
