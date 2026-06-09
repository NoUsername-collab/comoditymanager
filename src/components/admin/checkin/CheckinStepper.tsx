"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { validateCheckin } from "@/domain/checkin/validate";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { createCheckinAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import type {
  BookingForCheckin,
  CheckinFormData,
  CheckinGuestInput,
  CheckinSettings,
  PaymentStatus,
  ValidationResult,
} from "@/domain/checkin/types";
import {
  CHECKIN_PAYMENT_OPTIONS,
  paymentAmountForStatus,
} from "@/domain/checkin/types";

type Props = {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  onComplete: () => void;
  onCancel: () => void;
};

const STEPS = ["identity", "validate", "payment", "finish"] as const;
type StepKey = (typeof STEPS)[number];

export function CheckinStepper({
  booking,
  settings,
  onComplete,
  onCancel,
}: Props) {
  const t = useTranslations("admin.checkIn");
  const { showToast } = useAdminFx();
  const [pending, startTransition] = useTransition();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Guest data — pre-populated from booking
  const [guests, setGuests] = useState<CheckinGuestInput[]>([
    {
      full_name: booking.guest_name,
      phone: booking.guest_phone ?? "",
      document_type: null,
      document_number: "",
      nationality: "",
      birth_date: "",
      is_representative: true,
      guest_id: null,
    },
  ]);

  // Payment data
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paymentAmount, setPaymentAmount] = useState(booking.total_price);
  const [depositAmount, setDepositAmount] = useState(
    settings.checkin_deposit ? settings.checkin_deposit_amount : 0,
  );

  // Finalize data
  const [keyHanded, setKeyHanded] = useState(false);
  const [notes, setNotes] = useState("");

  // Validation result (computed on step 1)
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  const buildFormData = useCallback((): CheckinFormData => {
    return {
      type: "reservation",
      booking_id: booking.id,
      guests,
      payment_status: paymentStatus,
      payment_amount_paid: paymentAmountForStatus(
        paymentStatus,
        booking.total_price,
        paymentAmount
      ),
      deposit_amount: settings.checkin_deposit ? depositAmount : 0,
      key_handed: keyHanded,
      notes: notes || undefined,
    };
  }, [
    booking,
    guests,
    paymentStatus,
    paymentAmount,
    depositAmount,
    keyHanded,
    notes,
    settings,
  ]);

  // ── Navigation ────────────────────────────────────────────

  function goNext() {
    if (currentStep === 0) {
      // Moving from identity → validate: run validation
      const data = buildFormData();
      const now = new Date();
      const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const result = validateCheckin(data, settings, booking, currentHour);
      setValidation(result);
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  // ── Submit ────────────────────────────────────────────────

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const data = buildFormData();
      const fd = new FormData();
      fd.set("booking_id", data.booking_id);
      fd.set("type", data.type);
      fd.set("payment_status", data.payment_status);
      fd.set("payment_amount_paid", String(data.payment_amount_paid ?? 0));
      fd.set("deposit_amount", String(data.deposit_amount ?? 0));
      fd.set("key_handed", String(data.key_handed ?? false));
      fd.set("notes", data.notes ?? "");
      fd.set("guests", JSON.stringify(data.guests));

      const result = await createCheckinAction(fd);
      if (result.ok) {
        showToast({
          kind: "success",
          title: t("success"),
        });
        onComplete();
      } else {
        setError(result.error ?? "Unknown error");
      }
    });
  }

  // ── Guest field update helper ─────────────────────────────

  function updateGuest(
    index: number,
    field: keyof CheckinGuestInput,
    value: string | boolean | null,
  ) {
    setGuests((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    );
  }

  // ── Render ────────────────────────────────────────────────

  const stepKey = STEPS[currentStep];

  return (
    <div className="checkin-stepper">
      {/* Step indicators */}
      <div className="checkin-stepper__indicators">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`checkin-stepper__indicator ${
              i === currentStep
                ? "checkin-stepper__indicator--active"
                : i < currentStep
                  ? "checkin-stepper__indicator--done"
                  : ""
            }`}
          >
            <span className="checkin-stepper__indicator-num">{i + 1}</span>
            <span className="checkin-stepper__indicator-label">
              {t(`step.${s}`)}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="checkin-stepper__content">
        {stepKey === "identity" && (
          <StepIdentity
            guests={guests}
            updateGuest={updateGuest}
            t={t}
          />
        )}

        {stepKey === "validate" && (
          <StepValidation validation={validation} t={t} />
        )}

        {stepKey === "payment" && (
          <StepPayment
            booking={booking}
            settings={settings}
            paymentStatus={paymentStatus}
            paymentAmount={paymentAmount}
            depositAmount={depositAmount}
            onPaymentStatusChange={setPaymentStatus}
            onPaymentAmountChange={setPaymentAmount}
            onDepositAmountChange={setDepositAmount}
            t={t}
          />
        )}

        {stepKey === "finish" && (
          <StepFinish
            booking={booking}
            guests={guests}
            paymentStatus={paymentStatus}
            validation={validation}
            keyHanded={keyHanded}
            notes={notes}
            onKeyHandedChange={setKeyHanded}
            onNotesChange={setNotes}
            t={t}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="checkin-stepper__error">{error}</div>
      )}

      {/* Navigation buttons */}
      <div className="checkin-stepper__nav">
        {currentStep === 0 ? (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--secondary"
            onClick={onCancel}
          >
            {t("cancel")}
          </button>
        ) : (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--secondary"
            onClick={goBack}
            disabled={pending}
          >
            {t("back")}
          </button>
        )}

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--primary"
            onClick={goNext}
            disabled={
              stepKey === "validate" &&
              validation?.status === "blocked"
            }
          >
            {t("next")}
          </button>
        ) : (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--primary"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? t("saving") : t("confirm")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step sub-components (co-located for simplicity) ─────────

function StepIdentity({
  guests,
  updateGuest,
  t,
}: {
  guests: CheckinGuestInput[];
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="checkin-step-identity">
      {guests.map((guest, idx) => (
        <div key={idx} className="checkin-guest-form">
          <div className="checkin-guest-form__header">
            {t("guestN", { n: idx + 1 })}
          </div>

          <div className="checkin-guest-form__grid">
            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.fullName")}</span>
              <input
                type="text"
                className="checkin-field__input"
                value={guest.full_name}
                onChange={(e) => updateGuest(idx, "full_name", e.target.value)}
                required
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.phone")}</span>
              <input
                type="tel"
                className="checkin-field__input"
                value={guest.phone ?? ""}
                onChange={(e) => updateGuest(idx, "phone", e.target.value)}
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.documentType")}</span>
              <select
                className="checkin-field__input"
                value={guest.document_type ?? ""}
                onChange={(e) =>
                  updateGuest(
                    idx,
                    "document_type",
                    e.target.value || null,
                  )
                }
              >
                <option value="">{t("field.selectDoc")}</option>
                <option value="ci">{t("field.docCi")}</option>
                <option value="pasaport">{t("field.docPassport")}</option>
                <option value="permis">{t("field.docPermit")}</option>
              </select>
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.documentNumber")}</span>
              <input
                type="text"
                className="checkin-field__input"
                value={guest.document_number ?? ""}
                onChange={(e) =>
                  updateGuest(idx, "document_number", e.target.value)
                }
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.nationality")}</span>
              <input
                type="text"
                className="checkin-field__input"
                value={guest.nationality ?? ""}
                onChange={(e) =>
                  updateGuest(idx, "nationality", e.target.value)
                }
                placeholder="RO"
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.birthDate")}</span>
              <input
                type="date"
                className="checkin-field__input"
                value={guest.birth_date ?? ""}
                onChange={(e) =>
                  updateGuest(idx, "birth_date", e.target.value)
                }
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepValidation({
  validation,
  t,
}: {
  validation: ValidationResult | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!validation) return null;

  const statusClass =
    validation.status === "ok"
      ? "checkin-validation--ok"
      : validation.status === "warning"
        ? "checkin-validation--warning"
        : "checkin-validation--blocked";

  return (
    <div className={`checkin-validation ${statusClass}`}>
      <div className="checkin-validation__status">
        {validation.status === "ok" && "✓"}
        {validation.status === "warning" && "⚠"}
        {validation.status === "blocked" && "✕"}
        <span>{t(`validation.${validation.status}`)}</span>
      </div>

      {validation.blockers.length > 0 && (
        <ul className="checkin-validation__list checkin-validation__list--blockers">
          {validation.blockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {validation.flags.length > 0 && (
        <ul className="checkin-validation__list checkin-validation__list--flags">
          {validation.flags.map((f, i) => (
            <li key={i}>{t(`flag.${f}`)}</li>
          ))}
        </ul>
      )}

      {validation.status === "warning" && (
        <p className="checkin-validation__note">
          {t("validation.warningNote")}
        </p>
      )}
    </div>
  );
}

function StepPayment({
  booking,
  settings,
  paymentStatus,
  paymentAmount,
  depositAmount,
  onPaymentStatusChange,
  onPaymentAmountChange,
  onDepositAmountChange,
  t,
}: {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  depositAmount: number;
  onPaymentStatusChange: (v: PaymentStatus) => void;
  onPaymentAmountChange: (v: number) => void;
  onDepositAmountChange: (v: number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="checkin-step-payment">
      <div className="checkin-payment__total">
        <span className="checkin-payment__total-label">{t("payment.totalDue")}</span>
        <span className="checkin-payment__total-value">
          {booking.total_price}
        </span>
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
                  paymentAmountForStatus(s, booking.total_price, paymentAmount)
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

function StepFinish({
  booking,
  guests,
  paymentStatus,
  validation,
  keyHanded,
  notes,
  onKeyHandedChange,
  onNotesChange,
  t,
}: {
  booking: BookingForCheckin;
  guests: CheckinGuestInput[];
  paymentStatus: PaymentStatus;
  validation: ValidationResult | null;
  keyHanded: boolean;
  notes: string;
  onKeyHandedChange: (v: boolean) => void;
  onNotesChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="checkin-step-finish">
      {/* Summary */}
      <div className="checkin-summary">
        <div className="checkin-summary__row">
          <span className="checkin-summary__label">{t("field.guest")}</span>
          <span>{booking.guest_name}</span>
        </div>
        <div className="checkin-summary__row">
          <span className="checkin-summary__label">{t("field.dates")}</span>
          <span>
            {booking.check_in} → {booking.check_out}
          </span>
        </div>
        <div className="checkin-summary__row">
          <span className="checkin-summary__label">{t("payment.status")}</span>
          <span>{t(`payment.${paymentStatus}`)}</span>
        </div>
        <div className="checkin-summary__row">
          <span className="checkin-summary__label">{t("field.guestCount")}</span>
          <span>{guests.length}</span>
        </div>
        {validation && validation.flags.length > 0 && (
          <div className="checkin-summary__row checkin-summary__row--flags">
            <span className="checkin-summary__label">{t("flags")}</span>
            <span>
              {validation.flags.map((f) => t(`flag.${f}`)).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Key handed */}
      <label className="checkin-checkbox">
        <input
          type="checkbox"
          checked={keyHanded}
          onChange={(e) => onKeyHandedChange(e.target.checked)}
        />
        <span>{t("keyHanded")}</span>
      </label>

      {/* Notes */}
      <label className="checkin-field">
        <span className="checkin-field__label">{t("field.notes")}</span>
        <textarea
          className="checkin-field__input checkin-field__input--textarea"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t("field.notesPlaceholder")}
        />
      </label>
    </div>
  );
}
