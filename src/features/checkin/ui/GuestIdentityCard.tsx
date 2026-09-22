"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  guestHasLegalIdentity,
  isRomanianNationality,
} from "@/domain/checkin/identity-rules";
import {
  checkinUiDocTypeValue,
  docTypeUsesRomanianNationalId,
} from "@/domain/checkin/doc-type";
import {
  cleanNationalId,
  extractIdentityFromNationalId,
  NATIONAL_ID_LENGTH,
  validateNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { NationalIdTypePicker } from "@/features/guests/ui/NationalIdTypePicker";
import { isIdentityStatusCritical } from "@/domain/guest/profile-data";
import { GuestIdentityStatusPill } from "@/features/guests/ui/GuestIdentityStatusPill";
import { MrzScanDialog } from "@/features/checkin/ui/MrzScanDialog";
import type { MrzMappedIdentity } from "@/domain/guest/mrz";
import type { CheckinIdentityScope } from "@/domain/checkin/guest-layout";
import type {
  CheckinCnpRule,
  CheckinGuestInput,
} from "@/domain/checkin/types";

export function GuestIdentityCard({
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
  cnpRule: CheckinCnpRule;
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
  const showNationalIdFields = docTypeUsesRomanianNationalId(uiDocType);
  const cnpInCiSection = showCiFields && roGuest;
  const showNationalIdPickerSection = showNationalIdFields && !cnpInCiSection;
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
            <div className="checkin-guest-form__section-title">{t("touristSheet.sectionPersonal")}</div>
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

            {showDocFields && showNationalIdPickerSection && (
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
