"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  buildTouristSheetData,
  type TouristSheetData,
} from "@/domain/checkin/tourist-sheet";
import {
  guestFullName,
  isRomanianNationality,
} from "@/domain/checkin/identity-rules";
import { validateCheckin } from "@/domain/checkin/validate";
import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import {
  extractIdentityFromNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { publishGanttLiveBooking } from "@/lib/gantt/live-bookings";
import { publishStayPatch } from "@/lib/stays/live-stays";
import {
  createCheckinAction,
  updateCheckinAction,
  type CreateCheckinResult,
} from "@/features/checkin/actions";
import type { CheckinWizardMode } from "@/features/checkin/ui/CheckinWizardLauncher";
import type { CheckinTransferOffer } from "@/domain/checkin/identity-result";
import { createInitialCheckinGuests } from "@/features/checkin/ui/checkin-guest-defaults";
import {
  allowsOperatorScopeChoice,
  buildCheckinGuestSlots,
  buildCheckinGuestSlotsForRooms,
  detectFamilyRooms,
  effectiveIdentityScope,
  resolveReceptionRoomLabels,
  type CheckinIdentityScope,
  type IdsPerRoomConfig,
} from "@/domain/checkin/guest-layout";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { CheckinRoomPicker } from "@/features/checkin/ui/CheckinRoomPicker";
import { CheckinPaymentStep } from "@/features/checkin/ui/CheckinPaymentStep";
import { TouristSheetView } from "@/features/checkin/ui/TouristSheetView";
import { StepIdentity } from "@/features/checkin/ui/StepIdentity";
import { StepValidation } from "@/features/checkin/ui/StepValidation";
import { StepFinish } from "@/features/checkin/ui/StepFinish";
import { mrzToGuestPatch, type MrzMappedIdentity } from "@/domain/guest/mrz";
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
        publishStayPatch({
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
