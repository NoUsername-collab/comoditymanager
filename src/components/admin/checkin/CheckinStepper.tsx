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
import { computeKeyEligibilityByRoom } from "@/domain/checkin/key-rules";
import { detectFamilyRooms, type IdsPerRoomConfig } from "@/domain/checkin/guest-layout";
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
import { publishGanttLiveBooking } from "@/lib/gantt/live-bookings";
import { publishCazariStayPatch } from "@/lib/cazari/live-stays";
import {
  createCheckinAction,
  updateCheckinAction,
  type CreateCheckinResult,
} from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { CheckinWizardMode } from "@/components/admin/checkin/CheckinWizardLauncher";
import type { CheckinTransferOffer } from "@/domain/checkin/identity-result";
import { createInitialCheckinGuests } from "@/components/admin/checkin/checkin-guest-defaults";
import {
  allowsOperatorScopeChoice,
  bookingRooms,
  buildCheckinGuestSlots,
  buildCheckinGuestSlotsForRooms,
  effectiveIdentityScope,
  groupGuestsByRoom,
  resolveReceptionRoomLabels,
  type CheckinIdentityScope,
} from "@/domain/checkin/guest-layout";
import { CheckinKeysHandoff } from "@/components/admin/checkin/CheckinKeysHandoff";
import { isIdentityStatusCritical } from "@/domain/guest/profile-data";
import { GuestIdentityStatusPill } from "@/components/admin/guests/GuestIdentityForm";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { CheckinRoomPicker } from "@/components/admin/checkin/CheckinRoomPicker";
import { CheckinPaymentStep } from "@/components/admin/checkin/CheckinPaymentStep";
import { TouristSheetView } from "@/components/admin/checkin/TouristSheetView";
import { MrzScanDialog } from "@/components/admin/checkin/MrzScanDialog";
import { mrzToGuestPatch, type MrzMappedIdentity } from "@/domain/guest/mrz";
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
  paymentAmountForStatus,
} from "@/domain/checkin/types";
import { isCheckinPaymentSettled } from "@/domain/checkin/payment-panel";

type Props = {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  mode?: CheckinWizardMode;
  checkinId?: string;
  initialGuests?: CheckinGuestInput[];
  initialPaymentStatus?: PaymentStatus;
  initialPaymentAmountPaid?: number;
  initialDepositAmount?: number;
  ledgerCollectedHint?: string;
  initialKeysHandedRooms?: string[];
  initialNotes?: string;
  onComplete: () => void;
  onCancel: () => void;
};

const FULL_CORE = ["identity", "payment", "validate", "finish"] as const;
const CONTINUE_CORE = ["identity", "validate", "finish"] as const;
const CONTINUE_WITH_PAYMENT = ["identity", "payment", "validate", "finish"] as const;
type StepKey = "rooms" | (typeof FULL_CORE)[number];

export function CheckinStepper({
  booking,
  settings,
  mode = "create",
  checkinId,
  initialGuests,
  initialPaymentStatus,
  initialPaymentAmountPaid,
  initialDepositAmount,
  ledgerCollectedHint,
  initialKeysHandedRooms,
  initialNotes,
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
  const isEditMode = mode === "edit" && !!checkinId;
  const isContinuation = roomProgress.checked > 0 && !isEditMode;
  const paymentSettled = isCheckinPaymentSettled(
    initialPaymentStatus,
    booking.total_price,
  );
  const needsRoomPicker =
    roomProgress.isMultiRoom && roomProgress.pendingRooms.length > 0;
  const needsRoomPickerStep =
    needsRoomPicker && roomProgress.pendingRooms.length > 1;
  const steps = useMemo((): StepKey[] => {
    if (isEditMode) return [...FULL_CORE];
    const core = isContinuation
      ? paymentSettled
        ? CONTINUE_CORE
        : CONTINUE_WITH_PAYMENT
      : FULL_CORE;
    return needsRoomPickerStep ? ["rooms", ...core] : [...core];
  }, [isContinuation, needsRoomPickerStep, isEditMode, paymentSettled]);

  // Compute idsPerRoomConfig before using in useState initializer
  const idsPerRoomConfig = useMemo((): IdsPerRoomConfig | undefined => {
    if (settings.checkin_ids_per_room === "one") return undefined;
    return {
      rule: settings.checkin_ids_per_room,
      familyRooms: detectFamilyRooms(booking),
    };
  }, [settings.checkin_ids_per_room, booking]);

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
    if (initialGuests?.length) return initialGuests;
    if (needsRoomPicker && roomProgress.pendingRooms.length !== 1) {
      return [];
    }
    if (needsRoomPicker) {
      return buildCheckinGuestSlotsForRooms(
        booking,
        roomProgress.pendingRooms,
        effectiveIdentityScope(settings.group_checkin_mode, null),
        idsPerRoomConfig,
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
      setGuests(buildCheckinGuestSlotsForRooms(booking, selectedRooms, scope, idsPerRoomConfig));
    } else {
      setGuests(buildCheckinGuestSlots(booking, scope, idsPerRoomConfig));
    }
  }

  function guestsForRooms(
    roomLabels: string[],
    scope: CheckinIdentityScope = identityScope,
  ): CheckinGuestInput[] {
    return buildCheckinGuestSlotsForRooms(booking, roomLabels, scope, idsPerRoomConfig);
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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initialPaymentStatus ?? "unpaid",
  );
  const [paymentAmount, setPaymentAmount] = useState(() => {
    if (initialPaymentAmountPaid != null) return initialPaymentAmountPaid;
    if (initialPaymentStatus === "partial") return 0;
    return booking.total_price;
  });
  const [depositAmount, setDepositAmount] = useState(
    initialDepositAmount ??
      (settings.checkin_deposit ? settings.checkin_deposit_amount : 0),
  );

  // Finalize data
  const [keysHandedRooms, setKeysHandedRooms] = useState<string[]>(
    initialKeysHandedRooms ?? [],
  );
  const [notes, setNotes] = useState(initialNotes ?? "");

  // Validation result (computed before validate step)
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const receivingRoomLabels = useMemo(
    () =>
      resolveReceptionRoomLabels(
        booking,
        guests,
        needsRoomPicker && roomPickerDone && selectedRooms.length > 0
          ? selectedRooms
          : undefined,
      ),
    [booking, guests, needsRoomPicker, roomPickerDone, selectedRooms],
  );

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
      key_handed: keysHandedRooms.length > 0,
      keys_handed_rooms: keysHandedRooms,
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
    keysHandedRooms,
    notes,
    settings,
    identityScope,
    needsRoomPicker,
    roomPickerDone,
    selectedRooms,
  ]);

  // ── Navigation ────────────────────────────────────────────

  function runValidation() {
    const data = buildFormData();
    const now = new Date();
    const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setValidation(validateCheckin(data, settings, booking, currentHour));
  }

  function toggleKeysHandedRoom(room: string) {
    setKeysHandedRooms((prev) => {
      const exists = prev.some((r) => r.toLowerCase() === room.toLowerCase());
      if (exists) {
        return prev.filter((r) => r.toLowerCase() !== room.toLowerCase());
      }
      return [...prev, room];
    });
  }

  function toggleAllKeysHanded(checked: boolean) {
    setKeysHandedRooms(checked ? [...receivingRoomLabels] : []);
  }

  function goNext() {
    const leavingStep = steps[currentStep];
    if (leavingStep === "rooms") {
      if (selectedRooms.length === 0) return;
      confirmRoomSelection();
    }
    if (leavingStep === "payment" || (leavingStep === "identity" && isContinuation)) {
      runValidation();
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  // ── Submit ────────────────────────────────────────────────

  function handleCheckinResult(result: CreateCheckinResult) {
    if (result.ok) {
      if (result.ganttBooking) {
        publishGanttLiveBooking(result.ganttBooking);
        publishCazariStayPatch({
          id: result.ganttBooking.id,
          actual_check_in_at: result.ganttBooking.actual_check_in_at,
          checked_in_rooms: result.ganttBooking.checked_in_rooms,
          has_checkin_record: result.ganttBooking.has_checkin_record,
          checkin_payment_status: result.ganttBooking.checkin_payment_status,
          keys_handed_rooms: result.ganttBooking.keys_handed_rooms,
        });
      }
      setTransferOffer(null);
      showToast({
        kind: "success",
        title: isEditMode ? t("updatedSuccess") : t("success"),
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
    setError(result.error ?? t("unknownError"));
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
      fd.set("keys_handed_rooms", JSON.stringify(data.keys_handed_rooms ?? []));
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
      if (isEditMode && checkinId) {
        fd.set("checkin_id", checkinId);
        handleCheckinResult(await updateCheckinAction(fd));
        return;
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
        if (field === "document_type") {
          const uiType = checkinUiDocTypeValue(
            value == null
              ? null
              : (String(value) as CheckinGuestInput["document_type"]),
          );
          if (uiType === "ci" && isRomanianNationality(next.nationality)) {
            next.national_id_type = "cnp";
          }
        }
        return next;
      }),
    );
  }

  function applyGuestMrzScan(index: number, data: MrzMappedIdentity) {
    const patch = mrzToGuestPatch(data);
    setGuests((prev) =>
      prev.map((g, i) => {
        if (i !== index) return g;
        const next = { ...g, ...patch };
        next.full_name = guestFullName(next);
        return next;
      }),
    );
    showToast({
      kind: "success",
      title: t("mrz.appliedTitle"),
      message: t("mrz.appliedBody"),
    });
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
      <nav
        className="checkin-stepper__indicators"
        aria-label={t("stepProgressAria")}
      >
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
            aria-current={i === currentStep ? "step" : undefined}
          >
            <span className="checkin-stepper__indicator-num" aria-hidden>
              {i + 1}
            </span>
            <span className="checkin-stepper__indicator-label">
              {t(`step.${s}`)}
            </span>
          </div>
        ))}
      </nav>
      <div
        className="checkin-stepper__progress sr-only"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={currentStep + 1}
        aria-label={t("stepProgressAria")}
      />

      {/* Step content */}
      <div className="checkin-stepper__content">
        {stepKey === "rooms" ? (
          <CheckinRoomPicker
            progress={roomProgress}
            selectedRooms={selectedRooms}
            onToggleRoom={toggleSelectedRoom}
            onSelectAll={() => setSelectedRooms([...roomProgress.pendingRooms])}
            onSelectOne={(room) => setSelectedRooms([room])}
            labels={{
              title: t("roomPicker.title"),
              hint: t("roomPicker.hint"),
              sectionalHint: t("roomPicker.sectionalHint"),
              selectAll: t("roomPicker.selectAll"),
              selectOne: t("roomPicker.selectOne"),
              continue: t("roomPicker.continue"),
              checkedBadge: t("roomPicker.checkedBadge"),
              pendingBadge: t("roomPicker.pendingBadge"),
              selectedCount: t("roomPicker.selectedCount", {
                count: selectedRooms.length,
              }),
            }}
            onConfirm={confirmRoomSelection}
            canConfirm={selectedRooms.length > 0}
            hideConfirm
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
            onApplyMrz={applyGuestMrzScan}
            registeredOnly={registeredOnly}
            emptyRegistered={registeredOnly && guests.length === 0}
            t={t}
            continuationHint={
              isContinuation ? t("roomPicker.continuationHint") : undefined
            }
            repAllRoomsHint={
              identityScope === "rep" && receivingRoomLabels.length > 1
                ? t("identityScope.repAllRoomsHint", {
                    count: receivingRoomLabels.length,
                    rooms: receivingRoomLabels.join(", "),
                  })
                : undefined
            }
          />
        )}

        {stepKey === "payment" && (
          <CheckinPaymentStep
            booking={booking}
            settings={settings}
            paymentStatus={paymentStatus}
            paymentAmount={paymentAmount}
            depositAmount={depositAmount}
            ledgerCollectedHint={ledgerCollectedHint}
            onPaymentStatusChange={setPaymentStatus}
            onPaymentAmountChange={setPaymentAmount}
            onDepositAmountChange={setDepositAmount}
            t={t}
          />
        )}

        {stepKey === "validate" && (
          <StepValidation validation={validation} t={t} />
        )}

        {stepKey === "finish" && (
          <StepFinish
            booking={booking}
            guests={guests}
            settings={settings}
            paymentStatus={paymentStatus}
            paymentAmountPaid={paymentAmountForStatus(paymentStatus, booking.total_price, paymentAmount)}
            validation={validation}
            receivingRooms={receivingRoomLabels}
            keysHandedRooms={keysHandedRooms}
            onToggleKeysRoom={toggleKeysHandedRoom}
            onToggleAllKeys={toggleAllKeysHanded}
            notes={notes}
            onNotesChange={setNotes}
            isPartialSession={
              roomProgress.isMultiRoom &&
              receivingRoomLabels.length > 0 &&
              receivingRoomLabels.length + roomProgress.checked < roomProgress.total
            }
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
        <div className="checkin-stepper__error" role="alert" aria-live="assertive">
          {error}
        </div>
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
              (stepKey === "rooms" && selectedRooms.length === 0) ||
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
  onApplyMrz,
  registeredOnly,
  emptyRegistered,
  t,
  continuationHint,
  repAllRoomsHint,
}: {
  guests: CheckinGuestInput[];
  settings: CheckinSettings;
  booking: BookingForCheckin;
  identityScope: CheckinIdentityScope;
  operatorCanChoose: boolean;
  onScopeChange: (scope: CheckinIdentityScope) => void;
  onRemoveGuest?: (index: number) => void;
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  onApplyMrz: (index: number, data: MrzMappedIdentity) => void;
  registeredOnly: boolean;
  emptyRegistered: boolean;
  t: ReturnType<typeof useTranslations>;
  continuationHint?: string;
  repAllRoomsHint?: string;
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
      {repAllRoomsHint ? (
        <p className="checkin-rep-all-rooms-hint">{repAllRoomsHint}</p>
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
              onApplyMrz={(data) => onApplyMrz(idx, data)}
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
  onApplyMrz,
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
  onApplyMrz: (data: MrzMappedIdentity) => void;
  cnpRule: import("@/domain/checkin/types").CheckinCnpRule;
  t: ReturnType<typeof useTranslations>;
}) {
  const tIdentity = useTranslations("admin.guests.identity");
  const tMrz = useTranslations("admin.checkIn.mrz");
  const [mrzOpen, setMrzOpen] = useState(false);
  const keysOnly = !!guest.keys_only;
  const present = guest.present_at_checkin !== false && !keysOnly;
  const roGuest = isRomanianNationality(guest.nationality);
  const idType = (guest.national_id_type ?? "cnp") as NationalIdType;
  const uiDocType = checkinUiDocTypeValue(guest.document_type);
  const showDocFields = uiDocType !== "";
  const showCiFields = uiDocType === "ci";
  const cnpInCiSection = showCiFields && roGuest;
  const expectedIdLength = NATIONAL_ID_LENGTH[idType];
  const idState = guest.national_id?.trim()
    ? validateNationalId(idType, cleanNationalId(guest.national_id))
    : null;
  const birthFromNationalId = extractIdentityFromNationalId(idType, guest.national_id);
  const birthDateFromId = birthFromNationalId?.birthDate ?? null;
  const birthDateLocked = Boolean(birthDateFromId && guest.birth_date === birthDateFromId);
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
          <div className="checkin-guest-form__section-row">
            <div className="checkin-guest-form__section-title">{t("fisa.sectionPersonal")}</div>
            <button
              type="button"
              className="checkin-stepper__btn checkin-stepper__btn--secondary checkin-guest-form__mrz-btn"
              onClick={() => setMrzOpen(true)}
            >
              {tMrz("scanButton")}
            </button>
          </div>
          <MrzScanDialog
            open={mrzOpen}
            onClose={() => setMrzOpen(false)}
            onApply={onApplyMrz}
          />
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
              <span className="checkin-field__label">
                {t("field.birthDate")}
                {birthDateLocked ? (
                  <span className="checkin-field__hint-inline">
                    {" "}
                    ({t("field.birthDateFromIdShort")})
                  </span>
                ) : null}
              </span>
              <input
                type="date"
                className="checkin-field__input"
                value={guest.birth_date ?? birthDateFromId ?? ""}
                readOnly={birthDateLocked}
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
              <label className="checkin-field checkin-field--span2">
                <span className="checkin-field__label">
                  {tIdentity("nationalIdTypes.cnp")}
                  {cnpRule === "required" && <span className="checkin-field__required"> *</span>}
                </span>
                <input
                  type="text"
                  className="checkin-field__input"
                  inputMode="numeric"
                  maxLength={NATIONAL_ID_LENGTH.cnp + 2}
                  value={guest.national_id ?? ""}
                  onChange={(e) => updateGuest(idx, "national_id", e.target.value)}
                  placeholder={tIdentity("nationalIdPlaceholder", {
                    digits: NATIONAL_ID_LENGTH.cnp,
                  })}
                />
                {idState && !idState.valid && guest.national_id?.trim() ? (
                  <span className="checkin-field__error">
                    {tIdentity("nationalIdInvalid", { type: "CNP" })}
                  </span>
                ) : null}
              </label>
            )}

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
                  {!cnpInCiSection ? (
                    <span className="checkin-field__required"> *</span>
                  ) : null}
                </span>
                <input
                  type="date"
                  className="checkin-field__input"
                  value={guest.doc_expiry_date ?? ""}
                  onChange={(e) =>
                    updateGuest(idx, "doc_expiry_date", e.target.value)
                  }
                  required={!cnpInCiSection}
                />
              </label>
            )}

            {showDocFields && !cnpInCiSection && (
              <>
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
                    {roGuest && cnpRule === "required" && <span className="checkin-field__required"> *</span>}
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
              </>
            )}
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
  if (!validation) {
    return (
      <p className="checkin-validation checkin-validation__pending">
        {t("validation.pending")}
      </p>
    );
  }

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

function StepFinish({
  booking,
  guests,
  settings,
  paymentStatus,
  paymentAmountPaid,
  validation,
  receivingRooms,
  keysHandedRooms,
  onToggleKeysRoom,
  onToggleAllKeys,
  notes,
  onNotesChange,
  isPartialSession,
  t,
}: {
  booking: BookingForCheckin;
  guests: CheckinGuestInput[];
  settings: CheckinSettings;
  paymentStatus: PaymentStatus;
  paymentAmountPaid: number;
  validation: ValidationResult | null;
  receivingRooms: string[];
  keysHandedRooms: string[];
  onToggleKeysRoom: (room: string) => void;
  onToggleAllKeys: (checked: boolean) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isPartialSession: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const roomEligibility = useMemo(
    () =>
      settings.checkin_key_rule !== "always"
        ? computeKeyEligibilityByRoom(
            receivingRooms,
            guests,
            settings,
            paymentAmountPaid,
            booking.total_price,
          )
        : undefined,
    [receivingRooms, guests, settings, paymentAmountPaid, booking.total_price],
  );
  return (
    <div className="checkin-step-finish">
      {isPartialSession ? (
        <p className="checkin-step-finish__partial">{t("finish.partialSessionHint")}</p>
      ) : null}

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
        {receivingRooms.length > 0 ? (
          <div className="checkin-summary__row">
            <span className="checkin-summary__label">{t("finish.roomsThisSession")}</span>
            <span>{receivingRooms.join(", ")}</span>
          </div>
        ) : null}
        {validation && validation.flags.length > 0 && (
          <div className="checkin-summary__row checkin-summary__row--flags">
            <span className="checkin-summary__label">{t("flags")}</span>
            <span>
              {validation.flags.map((f) => t(`flag.${f}`)).join(", ")}
            </span>
          </div>
        )}
      </div>

      <CheckinKeysHandoff
        rooms={receivingRooms}
        keysHandedRooms={keysHandedRooms}
        onToggleRoom={onToggleKeysRoom}
        onToggleAll={onToggleAllKeys}
        roomEligibility={roomEligibility}
        labels={{
          title: t("keysHandoff.title"),
          hint: t("keysHandoff.hint"),
          selectAll: t("keysHandoff.selectAll"),
          noneYet: t("keysHandoff.noneYet"),
          partialHint: t("keysHandoff.partialHint"),
          blockedNoId: t("keysHandoff.blockedNoId"),
          blockedUnpaid: t("keysHandoff.blockedUnpaid"),
        }}
      />

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
