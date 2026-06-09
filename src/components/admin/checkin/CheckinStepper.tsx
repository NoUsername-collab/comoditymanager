"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { buildTouristSheetData } from "@/domain/checkin/fisa-turist";
import {
  guestFullName,
  isRomanianNationality,
} from "@/domain/checkin/identity-rules";
import { validateCheckin } from "@/domain/checkin/validate";
import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import {
  cleanNationalId,
  NATIONAL_ID_LENGTH,
  validateNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { NationalIdTypePicker } from "@/components/admin/guests/NationalIdTypePicker";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { createCheckinAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import { createInitialCheckinGuests } from "@/components/admin/checkin/checkin-guest-defaults";
import {
  allowsOperatorScopeChoice,
  bookingRooms,
  buildCheckinGuestSlots,
  createEmptyGuestSlot,
  effectiveIdentityScope,
  groupGuestsByRoom,
  type CheckinIdentityScope,
} from "@/domain/checkin/guest-layout";
import { TouristSheetView } from "@/components/admin/checkin/TouristSheetView";
import type { TouristSheetData } from "@/domain/checkin/fisa-turist";
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

  const [operatorScope, setOperatorScope] = useState<CheckinIdentityScope | null>(
    null,
  );
  const identityScope = effectiveIdentityScope(
    settings.group_checkin_mode,
    operatorScope,
  );
  const [guests, setGuests] = useState<CheckinGuestInput[]>(() =>
    createInitialCheckinGuests(booking, settings),
  );

  function applyIdentityScope(scope: CheckinIdentityScope) {
    setOperatorScope(scope);
    setGuests(buildCheckinGuestSlots(booking, scope));
  }

  function addGuestSlot() {
    const rooms = bookingRooms(booking);
    setGuests((prev) => [
      ...prev,
      createEmptyGuestSlot(rooms[prev.length % rooms.length]),
    ]);
  }

  function removeGuestSlot(index: number) {
    setGuests((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }
  const [sheetData, setSheetData] = useState<TouristSheetData | null>(null);

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
        setSheetData(buildTouristSheetData(booking, guests, settings));
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
      prev.map((g, i) => {
        if (i !== index) return g;
        const next = { ...g, [field]: value };
        if (field === "last_name" || field === "first_name") {
          next.full_name = guestFullName(next);
        }
        return next;
      }),
    );
  }

  // ── Render ────────────────────────────────────────────────

  const stepKey = STEPS[currentStep];

  if (sheetData) {
    return (
      <TouristSheetView
        data={sheetData}
        onClose={() => {
          setSheetData(null);
          onComplete();
        }}
      />
    );
  }

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
            settings={settings}
            booking={booking}
            identityScope={identityScope}
            operatorCanChoose={allowsOperatorScopeChoice(settings.group_checkin_mode)}
            onScopeChange={applyIdentityScope}
            onAddGuest={identityScope === "individual" ? addGuestSlot : undefined}
            onRemoveGuest={identityScope === "individual" ? removeGuestSlot : undefined}
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

const IDENTITY_SCOPES: CheckinIdentityScope[] = ["rep", "individual", "per_room"];

function StepIdentity({
  guests,
  settings,
  booking,
  identityScope,
  operatorCanChoose,
  onScopeChange,
  onAddGuest,
  onRemoveGuest,
  updateGuest,
  t,
}: {
  guests: CheckinGuestInput[];
  settings: CheckinSettings;
  booking: BookingForCheckin;
  identityScope: CheckinIdentityScope;
  operatorCanChoose: boolean;
  onScopeChange: (scope: CheckinIdentityScope) => void;
  onAddGuest?: () => void;
  onRemoveGuest?: (index: number) => void;
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const rooms = bookingRooms(booking);
  const roomGroups = groupGuestsByRoom(guests);
  const partyHint = t("identityScope.partyHint", {
    adults: booking.num_adults,
    children: booking.num_children,
  });

  return (
    <div className="checkin-step-identity">
      <p className="checkin-legal-hint">{t("fisa.legalHint")}</p>
      <p className="checkin-party-hint">{partyHint}</p>

      {operatorCanChoose && (
        <div className="checkin-identity-scope" role="radiogroup" aria-label={t("identityScope.title")}>
          <p className="checkin-identity-scope__title">{t("identityScope.title")}</p>
          <div className="checkin-identity-scope__options">
            {IDENTITY_SCOPES.map((scope) => (
              <label
                key={scope}
                className={[
                  "checkin-identity-scope__option",
                  identityScope === scope && "checkin-identity-scope__option--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="checkin-identity-scope"
                  checked={identityScope === scope}
                  onChange={() => onScopeChange(scope)}
                />
                <span className="checkin-identity-scope__label">{t(`identityScope.${scope}`)}</span>
                <span className="checkin-identity-scope__desc">{t(`identityScope.${scope}Desc`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!operatorCanChoose && (
        <p className="checkin-identity-scope__fixed">
          {t("identityScope.fixedMode", { mode: t(`identityScope.${identityScope}`) })}
        </p>
      )}

      {roomGroups.map((group) => (
        <section key={group.room} className="checkin-room-group">
          <header className="checkin-room-group__head">
            <span className="checkin-room-group__icon" aria-hidden>
              🛏
            </span>
            <div>
              <p className="checkin-room-group__title">{group.room}</p>
              <p className="checkin-room-group__meta">
                {t("identityScope.guestsInRoom", { count: group.guests.length })}
              </p>
            </div>
          </header>

          {group.guests.map(({ guest, index: idx }) => (
            <GuestIdentityCard
              key={idx}
              guest={guest}
              idx={idx}
              identityScope={identityScope}
              rooms={rooms}
              canRemove={identityScope === "individual" && guests.length > 1}
              onRemove={onRemoveGuest}
              updateGuest={updateGuest}
              t={t}
            />
          ))}
        </section>
      ))}

      {onAddGuest && (
        <button type="button" className="checkin-add-guest-btn" onClick={onAddGuest}>
          + {t("identityScope.addGuest")}
        </button>
      )}
    </div>
  );
}

function GuestIdentityCard({
  guest,
  idx,
  identityScope,
  rooms,
  canRemove,
  onRemove,
  updateGuest,
  t,
}: {
  guest: CheckinGuestInput;
  idx: number;
  identityScope: CheckinIdentityScope;
  rooms: string[];
  canRemove: boolean;
  onRemove?: (index: number) => void;
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const tIdentity = useTranslations("admin.guests.identity");
  const present = guest.present_at_checkin !== false;
  const roGuest = isRomanianNationality(guest.nationality);
  const idType = (guest.national_id_type ?? "cnp") as NationalIdType;
  const uiDocType = checkinUiDocTypeValue(guest.document_type);
  const showDocFields = uiDocType !== "";
  const showCiFields = uiDocType === "ci";
  const expectedIdLength = NATIONAL_ID_LENGTH[idType];
  const idState = guest.national_id?.trim()
    ? validateNationalId(idType, cleanNationalId(guest.national_id))
    : null;
  const idTypeLabel = tIdentity(`nationalIdTypes.${idType}`);
  const roomLocked = identityScope === "rep" || identityScope === "per_room";
  const showPresentToggle = identityScope === "individual";

  return (
    <div
      className={[
        "checkin-guest-form",
        !present && "checkin-guest-form--absent",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="checkin-guest-form__header">
        <span>
          {t("guestN", { n: idx + 1 })}
          {guest.is_representative && (
            <span className="checkin-guest-form__badge">{t("field.representative")}</span>
          )}
        </span>
        <div className="checkin-guest-form__header-actions">
          {showPresentToggle && (
            <label className="checkin-checkbox checkin-guest-form__present">
              <input
                type="checkbox"
                checked={present}
                onChange={(e) => updateGuest(idx, "present_at_checkin", e.target.checked)}
              />
              {t("field.presentAtCheckin")}
            </label>
          )}
          {canRemove && onRemove && (
            <button
              type="button"
              className="checkin-guest-form__remove"
              onClick={() => onRemove(idx)}
            >
              {t("identityScope.removeGuest")}
            </button>
          )}
        </div>
      </div>

      {!present ? (
        <p className="checkin-guest-form__absent-hint">{t("field.absentHint")}</p>
      ) : (
        <>
          <div className="checkin-guest-form__section-title">{t("fisa.sectionPersonal")}</div>
          <div className="checkin-guest-form__grid">
            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.lastName")}</span>
              <input
                type="text"
                className="checkin-field__input"
                value={guest.last_name ?? ""}
                onChange={(e) => updateGuest(idx, "last_name", e.target.value)}
                required
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.firstName")}</span>
              <input
                type="text"
                className="checkin-field__input"
                value={guest.first_name ?? ""}
                onChange={(e) => updateGuest(idx, "first_name", e.target.value)}
                required
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.nationality")}</span>
              <input
                type="text"
                className="checkin-field__input"
                value={guest.nationality ?? ""}
                onChange={(e) => updateGuest(idx, "nationality", e.target.value)}
                placeholder="România"
              />
            </label>

            <label className="checkin-field">
              <span className="checkin-field__label">{t("field.birthDate")}</span>
              <input
                type="date"
                className="checkin-field__input"
                value={guest.birth_date ?? ""}
                onChange={(e) => updateGuest(idx, "birth_date", e.target.value)}
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
              <span className="checkin-field__label">{t("field.roomLabel")}</span>
              {roomLocked || rooms.length <= 1 ? (
                <input
                  type="text"
                  className="checkin-field__input"
                  value={guest.room_label ?? rooms[0]}
                  readOnly
                />
              ) : (
                <select
                  className="checkin-field__input"
                  value={guest.room_label ?? rooms[0]}
                  onChange={(e) => updateGuest(idx, "room_label", e.target.value)}
                >
                  {rooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>

          <div className="checkin-guest-form__section-title">
            {tIdentity("documentSection")}
          </div>
          <div className="checkin-guest-form__grid">
            <label className="checkin-field checkin-field--span2">
              <span className="checkin-field__label">{tIdentity("docType")}</span>
              <select
                className="checkin-field__input"
                value={uiDocType}
                onChange={(e) =>
                  updateGuest(idx, "document_type", e.target.value || null)
                }
              >
                <option value="">{tIdentity("selectDocType")}</option>
                <option value="ci">{tIdentity("docTypes.ci")}</option>
                <option value="passport">{tIdentity("docTypes.passport")}</option>
                <option value="foreign_id">{tIdentity("docTypes.foreign_id")}</option>
                <option value="other">{tIdentity("docTypes.other")}</option>
              </select>
            </label>

            {showDocFields && showCiFields && (
              <label className="checkin-field">
                <span className="checkin-field__label">{tIdentity("docSeries")}</span>
                <input
                  type="text"
                  className="checkin-field__input"
                  value={guest.document_series ?? ""}
                  onChange={(e) =>
                    updateGuest(idx, "document_series", e.target.value.toUpperCase())
                  }
                  placeholder="XZ"
                  maxLength={4}
                />
              </label>
            )}

            {showDocFields && (
              <label className={`checkin-field ${!showCiFields ? "checkin-field--span2" : ""}`}>
                <span className="checkin-field__label">{tIdentity("docNumber")}</span>
                <input
                  type="text"
                  className="checkin-field__input"
                  value={guest.document_number ?? ""}
                  onChange={(e) => updateGuest(idx, "document_number", e.target.value)}
                  placeholder={
                    showCiFields ? "123456" : tIdentity("docNumberPlaceholder")
                  }
                />
              </label>
            )}
          </div>

          <div className="checkin-guest-form__section-title">
            {tIdentity("personalSection")}
          </div>
          <div className="checkin-guest-form__grid checkin-guest-form__grid--national-id">
            <label className="checkin-field">
              <span className="checkin-field__label">{tIdentity("nationalIdType")}</span>
              <NationalIdTypePicker
                value={idType}
                onChange={(type) => updateGuest(idx, "national_id_type", type)}
                labelForType={(type) => tIdentity(`nationalIdTypes.${type}`)}
                triggerClassName="checkin-field__input"
              />
            </label>

            <label className="checkin-field checkin-field--span2">
              <span className="checkin-field__label">
                {idTypeLabel}
                {roGuest && <span className="checkin-field__required"> *</span>}
              </span>
              <input
                type="text"
                className="checkin-field__input"
                inputMode="numeric"
                maxLength={expectedIdLength + 2}
                value={guest.national_id ?? ""}
                onChange={(e) => updateGuest(idx, "national_id", e.target.value)}
                placeholder={tIdentity("nationalIdPlaceholder", {
                  digits: expectedIdLength,
                })}
              />
              {idState && !idState.valid && (
                <span className="checkin-field__error">
                  {tIdentity("nationalIdInvalid", { type: idType.toUpperCase() })}
                </span>
              )}
              {idState?.valid && idState.data?.birthDate && (
                <span className="checkin-field__hint">
                  {t("field.cnpDerivedBirth", { date: idState.data.birthDate })}
                </span>
              )}
              <span className="checkin-field__hint">
                {tIdentity("nationalIdHint", {
                  type: idTypeLabel,
                  digits: expectedIdLength,
                })}
              </span>
            </label>
          </div>
        </>
      )}
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
