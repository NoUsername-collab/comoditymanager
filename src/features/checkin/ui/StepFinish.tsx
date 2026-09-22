"use client";

import { useMemo } from "react";
import type { useTranslations } from "next-intl";
import { computeKeyEligibilityByRoom } from "@/domain/checkin/key-rules";
import { CheckinKeysHandoff } from "@/features/checkin/ui/CheckinKeysHandoff";
import type {
  BookingForCheckin,
  CheckinGuestInput,
  CheckinSettings,
  PaymentStatus,
  ValidationResult,
} from "@/domain/checkin/types";

export function StepFinish({
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
