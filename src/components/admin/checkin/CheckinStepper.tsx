"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildTouristSheetData } from "@/domain/checkin/fisa-turist";
import {
  guestFullName,
  guestHasLegalIdentity,
  isRomanianNationality,
} from "@/domain/checkin/identity-rules";
import { validateCheckin } from "@/domain/checkin/validate";
import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import {
  cleanNationalId,
  extractIdentityFromNationalId,
  NATIONAL_ID_LENGTH,
  validateNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { NationalIdTypePicker } from "@/components/admin/guests/NationalIdTypePicker";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  createCheckinAction,
  type CreateCheckinResult,
} from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { CheckinTransferOffer } from "@/domain/checkin/identity-result";
import { createInitialCheckinGuests } from "@/components/admin/checkin/checkin-guest-defaults";
import {
  allowsOperatorScopeChoice,
  bookingRooms,
  buildCheckinGuestSlots,
  buildCheckinGuestSlotsForRooms,
  effectiveIdentityScope,
  groupGuestsByRoom,
  type CheckinIdentityScope,
} from "@/domain/checkin/guest-layout";
import { isIdentityStatusCritical } from "@/domain/guest/profile-data";
import { GuestIdentityStatusPill } from "@/components/admin/guests/GuestIdentityForm";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { CheckinRoomPicker } from "@/components/admin/checkin/CheckinRoomPicker";
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

const FULL_STEPS = ["identity", "validate", "payment", "finish"] as const;
const CONTINUE_STEPS = ["identity", "validate", "finish"] as const;
type StepKey = (typeof FULL_STEPS)[number];

export function CheckinStepper({
  booking,
  settings,
  onComplete,
  onCancel,
}: Props) {
  const t = useTranslations("admin.checkIn");
  const { showToast } = useAdminFx();
  const [pending, startTransition] = useTransition();

  const roomProgress = useMemo(
    () =>
      computeRoomCheckinProgress(
        booking.room_names,
        booking.checked_in_rooms,
      ),
    [booking.room_names, booking.checked_in_rooms],
  );
  const isContinuation = roomProgress.checked > 0;
  const needsRoomPicker =
    roomProgress.isMultiRoom && roomProgress.pendingRooms.length > 0;
  const steps = isContinuation ? CONTINUE_STEPS : FULL_STEPS;

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  const [operatorScope, setOperatorScope] = useState<CheckinIdentityScope | null>(
    null,
  );
  const identityScope = effectiveIdentityScope(
    settings.group_checkin_mode,
    operatorScope,
  );

  const [selectedRooms, setSelectedRooms] = useState<string[]>(() =>
    needsRoomPicker && roomProgress.pendingRooms.length === 1
      ? roomProgress.pendingRooms
      : [],
  );
  const [roomPickerDone, setRoomPickerDone] = useState(
    !needsRoomPicker || roomProgress.pendingRooms.length === 1,
  );

  const [guests, setGuests] = useState<CheckinGuestInput[]>(() => {
    if (needsRoomPicker && roomProgress.pendingRooms.length !== 1) {
      return [];
    }
    if (needsRoomPicker) {
      return buildCheckinGuestSlotsForRooms(
        booking,
        roomProgress.pendingRooms,
        effectiveIdentityScope(settings.group_checkin_mode, null),
      );
    }
    return createInitialCheckinGuests(booking, settings);
  });

  function applyIdentityScope(scope: CheckinIdentityScope) {
    if (needsRoomPicker && !roomPickerDone) return;
    if (registeredOnly) {
      const count = booking.registered_guests?.length ?? 0;
      if (count > 1 && scope !== "per_room") return;
      if (count <= 1 && scope === "individual") return;
    }
    setOperatorScope(scope);
    if (needsRoomPicker && roomPickerDone && selectedRooms.length > 0) {
      setGuests(buildCheckinGuestSlotsForRooms(booking, selectedRooms, scope));
    } else {
      setGuests(buildCheckinGuestSlots(booking, scope));
    }
  }

  function guestsForRooms(
    roomLabels: string[],
    scope: CheckinIdentityScope = identityScope,
  ): CheckinGuestInput[] {
    return buildCheckinGuestSlotsForRooms(booking, roomLabels, scope);
  }

  function confirmRoomSelection() {
    if (!selectedRooms.length) return;
    setRoomPickerDone(true);
    const scope = effectiveIdentityScope(settings.group_checkin_mode, operatorScope);
    setGuests(guestsForRooms(selectedRooms, scope));
  }

  function toggleSelectedRoom(room: string) {
    setSelectedRooms((prev) => {
      const exists = prev.some((r) => r.toLowerCase() === room.toLowerCase());
      if (exists) {
        return prev.filter((r) => r.toLowerCase() !== room.toLowerCase());
      }
      if (registeredOnly && prev.length >= maxSelectableRooms) {
        return prev;
      }
      return [...prev, room];
    });
  }

  const registeredOnly = (booking.registered_guests?.length ?? 0) > 0;
  const maxSelectableRooms =
    registeredOnly && identityScope === "per_room"
      ? Math.max(1, booking.registered_guests?.length ?? 1)
      : roomProgress.pendingRooms.length;

  function removeGuestSlot(index: number) {
    if (registeredOnly) return;
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

  // Error / transfer offer
  const [error, setError] = useState<string | null>(null);
  const [transferOffer, setTransferOffer] =
    useState<CheckinTransferOffer | null>(null);

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
      identity_scope: identityScope,
      reception_rooms:
        needsRoomPicker && roomPickerDone && selectedRooms.length > 0
          ? selectedRooms
          : undefined,
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
    identityScope,
    needsRoomPicker,
    roomPickerDone,
    selectedRooms,
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
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  // ── Submit ────────────────────────────────────────────────

  function handleCheckinResult(result: CreateCheckinResult) {
    if (result.ok) {
      setTransferOffer(null);
      showToast({
        kind: "success",
        title: t("success"),
      });
      setSheetData(buildTouristSheetData(booking, guests, settings));
      return;
    }
    if (result.needsTransfer && result.transferOffer) {
      setTransferOffer(result.transferOffer);
      setError(null);
      return;
    }
    setTransferOffer(null);
    setError(result.error ?? "Unknown error");
  }

  function handleSubmit(transferToGuestId?: string) {
    setError(null);
    if (!transferToGuestId) setTransferOffer(null);
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
      fd.set("identity_scope", data.identity_scope ?? "");
      fd.set(
        "reception_rooms",
        JSON.stringify(data.reception_rooms ?? []),
      );
      if (transferToGuestId) {
        fd.set("transfer_booking_to_guest_id", transferToGuestId);
      }

      handleCheckinResult(await createCheckinAction(fd));
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
        if (field === "national_id" || field === "national_id_type") {
          const idType = (
            field === "national_id_type" ? value : next.national_id_type ?? "cnp"
          ) as NationalIdType;
          const idRaw =
            field === "national_id" ? String(value ?? "") : next.national_id ?? "";
          const extracted = extractIdentityFromNationalId(idType, idRaw);
          if (extracted?.birthDate) {
            next.birth_date = extracted.birthDate;
          } else if (field === "national_id" && !idRaw.trim()) {
            next.birth_date = null;
          }
        }
        return next;
      }),
    );
  }

  // ── Render ────────────────────────────────────────────────

  const stepKey = steps[currentStep];

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
        {steps.map((s, i) => (
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
        {stepKey === "identity" && !roomPickerDone && needsRoomPicker ? (
          <CheckinRoomPicker
            progress={roomProgress}
            selectedRooms={selectedRooms}
            onToggleRoom={toggleSelectedRoom}
            onSelectAll={() => setSelectedRooms([...roomProgress.pendingRooms])}
            onSelectOne={(room) => {
              setSelectedRooms([room]);
              setRoomPickerDone(true);
              const scope = effectiveIdentityScope(
                settings.group_checkin_mode,
                operatorScope,
              );
              setGuests(guestsForRooms([room], scope));
            }}
            labels={{
              title: t("roomPicker.title"),
              hint: t("roomPicker.hint"),
              selectAll: t("roomPicker.selectAll"),
              selectOne: t("roomPicker.selectOne"),
              continue: t("roomPicker.continue"),
              checkedBadge: t("roomPicker.checkedBadge"),
              pendingBadge: t("roomPicker.pendingBadge"),
            }}
            onConfirm={confirmRoomSelection}
            canConfirm={selectedRooms.length > 0}
          />
        ) : null}

        {stepKey === "identity" && (roomPickerDone || !needsRoomPicker) && (
          <StepIdentity
            guests={guests}
            settings={settings}
            booking={booking}
            identityScope={identityScope}
            operatorCanChoose={
              (allowsOperatorScopeChoice(settings.group_checkin_mode) ||
                (needsRoomPicker &&
                  roomPickerDone &&
                  selectedRooms.length > 0)) &&
              (!registeredOnly ||
                (booking.registered_guests?.length ?? 0) <= 1)
            }
            onScopeChange={applyIdentityScope}
            onRemoveGuest={
              !registeredOnly && identityScope === "individual"
                ? removeGuestSlot
                : undefined
            }
            updateGuest={updateGuest}
            registeredOnly={registeredOnly}
            emptyRegistered={registeredOnly && guests.length === 0}
            t={t}
            continuationHint={
              isContinuation ? t("roomPicker.continuationHint") : undefined
            }
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

      {transferOffer ? (
        <div className="checkin-stepper__transfer rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium">{t("transfer.title")}</p>
          <p className="mt-1 text-sky-900/90">
            {t("transfer.prompt", {
              existing: transferOffer.existingGuestName,
              booking: transferOffer.bookingGuestName,
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="checkin-stepper__btn checkin-stepper__btn--primary"
              disabled={pending}
              onClick={() =>
                handleSubmit(transferOffer.existingGuestId)
              }
            >
              {t("transfer.confirm", {
                name: transferOffer.existingGuestName,
              })}
            </button>
            <button
              type="button"
              className="checkin-stepper__btn checkin-stepper__btn--secondary"
              disabled={pending}
              onClick={() => setTransferOffer(null)}
            >
              {t("transfer.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="checkin-stepper__error">{error}</div>
      ) : null}

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

        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--primary"
            onClick={goNext}
            disabled={
              (stepKey === "identity" && needsRoomPicker && !roomPickerDone) ||
              (stepKey === "validate" && validation?.status === "blocked")
            }
          >
            {t("next")}
          </button>
        ) : (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--primary"
            onClick={() => handleSubmit()}
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
  onRemoveGuest,
  updateGuest,
  registeredOnly,
  emptyRegistered,
  t,
  continuationHint,
}: {
  guests: CheckinGuestInput[];
  settings: CheckinSettings;
  booking: BookingForCheckin;
  identityScope: CheckinIdentityScope;
  operatorCanChoose: boolean;
  onScopeChange: (scope: CheckinIdentityScope) => void;
  onRemoveGuest?: (index: number) => void;
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  registeredOnly: boolean;
  emptyRegistered: boolean;
  t: ReturnType<typeof useTranslations>;
  continuationHint?: string;
}) {
  const rooms = bookingRooms(booking);
  const roomGroups = groupGuestsByRoom(guests);
  const partyHint = t("identityScope.partyHint", {
    adults: booking.num_adults,
    children: booking.num_children,
  });

  if (emptyRegistered) {
    return (
      <div className="checkin-step-identity checkin-step-identity--empty">
        <p className="checkin-registered-empty__title">{t("registeredGuests.emptyTitle")}</p>
        <p className="checkin-registered-empty__hint">{t("registeredGuests.emptyHint")}</p>
        {booking.guest_id ? (
          <Link
            href={`/admin/guests/${booking.guest_id}`}
            className="checkin-registered-empty__link"
          >
            {t("registeredGuests.openProfile")}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="checkin-step-identity">
      {registeredOnly ? (
        <p className="checkin-registered-only-hint">{t("registeredGuests.onlyHint")}</p>
      ) : null}
      {continuationHint ? (
        <p className="checkin-continuation-hint">{continuationHint}</p>
      ) : null}
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
              canRemove={
                !registeredOnly &&
                identityScope === "individual" &&
                guests.length > 1
              }
              onRemove={onRemoveGuest}
              updateGuest={updateGuest}
              cnpRule={settings.checkin_cnp_rule}
              t={t}
            />
          ))}
        </section>
      ))}
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
  cnpRule,
  t,
}: {
  guest: CheckinGuestInput;
  idx: number;
  identityScope: CheckinIdentityScope;
  rooms: string[];
  canRemove: boolean;
  onRemove?: (index: number) => void;
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  cnpRule: import("@/domain/checkin/types").CheckinCnpRule;
  t: ReturnType<typeof useTranslations>;
}) {
  const tIdentity = useTranslations("admin.guests.identity");
  const keysOnly = !!guest.keys_only;
  const present = guest.present_at_checkin !== false && !keysOnly;
  const roGuest = isRomanianNationality(guest.nationality);
  const idType = (guest.national_id_type ?? "cnp") as NationalIdType;
  const uiDocType = checkinUiDocTypeValue(guest.document_type);
  const showDocFields = uiDocType !== "";
  const showCiFields = uiDocType === "ci";
  const expectedIdLength = NATIONAL_ID_LENGTH[idType];
  const idState = guest.national_id?.trim()
    ? validateNationalId(idType, cleanNationalId(guest.national_id))
    : null;
  const birthFromNationalId = extractIdentityFromNationalId(idType, guest.national_id);
  const showManualBirthDate = !birthFromNationalId?.birthDate;
  const idTypeLabel = tIdentity(`nationalIdTypes.${idType}`);
  const roomLocked = identityScope === "rep" || identityScope === "per_room";
  const showPresentToggle =
    identityScope === "individual" && !guest.guest_id && !keysOnly;
  const showKeysOnlyActions =
    identityScope === "per_room" && !guest.is_representative;
  const identityCritical =
    !keysOnly &&
    (isIdentityStatusCritical(guest.identity_status) ||
      (cnpRule === "required" && !guestHasLegalIdentity(guest)));

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
        <span className="checkin-guest-form__name-row">
          <span>
            {guest.last_name || guest.first_name
              ? `${guest.last_name ?? ""} ${guest.first_name ?? ""}`.trim()
              : t("guestN", { n: idx + 1 })}
            {guest.is_representative && (
              <span className="checkin-guest-form__badge">{t("field.representative")}</span>
            )}
          </span>
          {guest.identity_status ? (
            <GuestIdentityStatusPill status={guest.identity_status} compact />
          ) : null}
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
          {showKeysOnlyActions && !keysOnly && (
            <button
              type="button"
              className="checkin-guest-form__keys-only"
              onClick={() => {
                updateGuest(idx, "keys_only", true);
                updateGuest(idx, "present_at_checkin", false);
              }}
            >
              {t("field.keysOnly")}
            </button>
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

      {identityCritical ? (
        <p className="checkin-guest-form__alert checkin-guest-form__alert--grave">
          {t("registeredGuests.identityCritical")}
        </p>
      ) : null}

      {keysOnly ? (
        <div className="checkin-guest-form__keys-only-panel">
          <p className="checkin-guest-form__keys-hint">{t("field.keysOnlyHint")}</p>
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--secondary checkin-guest-form__claim"
            onClick={() => {
              updateGuest(idx, "keys_only", false);
              updateGuest(idx, "present_at_checkin", true);
            }}
          >
            {t("field.claimRoom")}
          </button>
        </div>
      ) : !present ? (
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

            {showManualBirthDate ? (
              <label className="checkin-field">
                <span className="checkin-field__label">{t("field.birthDate")}</span>
                <input
                  type="date"
                  className="checkin-field__input"
                  value={guest.birth_date ?? ""}
                  onChange={(e) => updateGuest(idx, "birth_date", e.target.value)}
                />
              </label>
            ) : null}

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

            {showDocFields && (
              <label className="checkin-field checkin-field--span2">
                <span className="checkin-field__label">
                  {tIdentity("docExpiryDate")}
                  <span className="checkin-field__required"> *</span>
                </span>
                <input
                  type="date"
                  className="checkin-field__input"
                  value={guest.doc_expiry_date ?? ""}
                  onChange={(e) =>
                    updateGuest(idx, "doc_expiry_date", e.target.value)
                  }
                  required
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
                  {t("field.birthDateFromId", { date: idState.data.birthDate })}
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
