"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { GuestRow, GuestNationalIdType } from "@/domain/guest/types";
import {
  validateNationalId,
  cleanNationalId,
  extractIdentityFromNationalId,
  NATIONAL_ID_LENGTH,
  NATIONAL_ID_COUNTRY,
} from "@/domain/guest/national-id";
import type { NationalIdType } from "@/domain/guest/national-id";
import { NationalIdTypePicker } from "@/components/admin/guests/NationalIdTypePicker";
import { updateGuestIdentityAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { AdminAlertDialog } from "@/components/admin/overlay/AdminAlertDialog";
import { MrzScanDialog } from "@/components/admin/checkin/MrzScanDialog";
import {
  mrzToGuestProfileFields,
  type MrzMappedIdentity,
} from "@/domain/guest/mrz";

type DocType = "ci" | "passport" | "foreign_id" | "other" | "";

const ROMANIAN_COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
  "Brăila", "Brașov", "București", "Buzău", "Călărași", "Caraș-Severin",
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Sălaj", "Satu Mare",
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui",
  "Vrancea",
];

/** Mapping from country to default national ID type */
const COUNTRY_TO_ID_TYPE: Record<string, NationalIdType> = {
  "România": "cnp",
  "Romania": "cnp",
  "RO": "cnp",
  "Moldova": "idnp",
  "Republica Moldova": "idnp",
  "MD": "idnp",
  "Bulgaria": "egn",
  "BG": "egn",
  "Grecia": "amka",
  "Greece": "amka",
  "GR": "amka",
  "Ungaria": "amka",
  "Hungary": "szemelyi_szam",
  "HU": "szemelyi_szam",
};

function inferNationalIdType(country: string, nationality: string): NationalIdType {
  return COUNTRY_TO_ID_TYPE[country] ?? COUNTRY_TO_ID_TYPE[nationality] ?? "cnp";
}

export function GuestIdentityForm({ guest }: { guest: GuestRow }) {
  const t = useTranslations("admin.guests.identity");
  const tCommon = useTranslations("admin.common");
  const tRoot = useTranslations("common");
  const tErrors = useTranslations("errors");
  const runAdminAction = useRunAdminAction();
  const { pending } = useAdminPending();

  const [docType, setDocType] = useState<DocType>(guest.doc_type ?? "");
  const [docSeries, setDocSeries] = useState(guest.doc_series ?? "");
  const [docNumber, setDocNumber] = useState(guest.doc_number ?? "");
  const [docIssuedBy, setDocIssuedBy] = useState(guest.doc_issued_by ?? "");
  const [docIssueDate, setDocIssueDate] = useState(guest.doc_issue_date ?? "");
  const [docExpiryDate, setDocExpiryDate] = useState(guest.doc_expiry_date ?? "");

  const initialNationalId = guest.national_id ?? guest.cnp ?? "";
  const initialNationalIdType = (guest.national_id_type as NationalIdType) ?? "cnp";
  const initialExtracted = extractIdentityFromNationalId(
    initialNationalIdType,
    initialNationalId
  );

  // National ID
  const [nationalIdType, setNationalIdType] = useState<NationalIdType>(
    initialNationalIdType
  );
  const [nationalId, setNationalId] = useState(initialNationalId);

  const [birthDate, setBirthDate] = useState(
    initialExtracted?.birthDate ?? guest.birth_date ?? ""
  );
  const [birthPlace, setBirthPlace] = useState(guest.birth_place ?? "");
  const [nationality, setNationality] = useState(guest.nationality ?? "România");
  const [address, setAddress] = useState(guest.address ?? "");
  const [city, setCity] = useState(guest.city ?? "");
  const [county, setCounty] = useState(guest.county ?? "");
  const [country, setCountry] = useState(guest.country ?? "România");
  const [sex, setSex] = useState<"M" | "F" | "">(
    initialExtracted?.sex ?? guest.sex ?? ""
  );
  const [phone, setPhone] = useState(guest.phone ?? "");

  const [idError, setIdError] = useState<string | null>(null);
  const [idAutoFilled, setIdAutoFilled] = useState(Boolean(initialExtracted?.birthDate));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mrzOpen, setMrzOpen] = useState(false);
  const tMrz = useTranslations("admin.checkIn.mrz");

  const expectedLength = NATIONAL_ID_LENGTH[nationalIdType];

  const applyExtractedIdentity = useCallback(
    (type: NationalIdType, raw: string) => {
      const extracted = extractIdentityFromNationalId(type, raw);
      if (!extracted) {
        setIdAutoFilled(false);
        return false;
      }
      if (extracted.birthDate) setBirthDate(extracted.birthDate);
      if (extracted.sex) setSex(extracted.sex);
      setIdAutoFilled(true);
      setIdError(null);
      return true;
    },
    []
  );

  const handleNationalIdChange = useCallback(
    (raw: string) => {
      setNationalId(raw);
      setIdError(null);

      const cleaned = cleanNationalId(raw);
      if (cleaned.length === expectedLength) {
        if (!applyExtractedIdentity(nationalIdType, cleaned)) {
          setIdError(t("nationalIdInvalid", { type: nationalIdType.toUpperCase() }));
        }
      } else {
        setIdAutoFilled(false);
      }
    },
    [nationalIdType, expectedLength, t, applyExtractedIdentity]
  );

  const handleNationalIdTypeChange = useCallback(
    (newType: NationalIdType) => {
      setNationalIdType(newType);
      setIdError(null);
      setIdAutoFilled(false);
      if (nationalId.trim()) {
        applyExtractedIdentity(newType, nationalId);
      } else {
        setBirthDate("");
        setSex("");
      }
      // Auto-set country based on ID type
      const idCountry = NATIONAL_ID_COUNTRY[newType];
      const countryNames: Record<string, string> = {
        RO: "România", MD: "Republica Moldova", BG: "Bulgaria", GR: "Grecia", HU: "Ungaria",
      };
      if (idCountry && countryNames[idCountry]) {
        setCountry(countryNames[idCountry]);
        setNationality(countryNames[idCountry]);
      }
    },
    [applyExtractedIdentity, nationalId]
  );

  function applyMrzScan(data: MrzMappedIdentity) {
    const fields = mrzToGuestProfileFields(data);
    if (fields.docType) setDocType(fields.docType);
    if (fields.docNumber) setDocNumber(fields.docNumber);
    if (fields.docExpiryDate) setDocExpiryDate(fields.docExpiryDate);
    if (fields.nationalId) {
      setNationalId(fields.nationalId);
      setNationalIdType(fields.nationalIdType);
    }
    if (fields.nationality) {
      setNationality(fields.nationality);
      setCountry(fields.country);
    }
    if (fields.birthDate) setBirthDate(fields.birthDate);
    if (fields.sex) setSex(fields.sex);
    setIdAutoFilled(fields.idAutoFilled);
    setIdError(null);
    setSuccess(false);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(false);

    if (!isValidGuestPhone(phone)) {
      setError(tErrors("phoneRequired"));
      return;
    }

    // Validate national ID if provided
    if (nationalId.trim()) {
      const cleaned = cleanNationalId(nationalId);
      const result = validateNationalId(nationalIdType, cleaned);
      if (!result.valid) {
        setError(t("nationalIdInvalid", { type: nationalIdType.toUpperCase() }));
        return;
      }
    }

    const formData = new FormData();
    formData.set("guest_id", guest.id);
    formData.set("phone", phone.trim());
    formData.set("doc_type", docType);
    formData.set("doc_series", docSeries);
    formData.set("doc_number", docNumber);
    formData.set("doc_issued_by", docIssuedBy);
    formData.set("doc_issue_date", docIssueDate);
    formData.set("doc_expiry_date", docExpiryDate);
    formData.set("national_id_type", nationalIdType);
    formData.set("national_id", cleanNationalId(nationalId));
    formData.set("birth_date", birthDate);
    formData.set("birth_place", birthPlace);
    formData.set("nationality", nationality);
    formData.set("address", address);
    formData.set("city", city);
    formData.set("county", county);
    formData.set("country", country);
    formData.set("sex", sex);

    const result = await runAdminAction(() => updateGuestIdentityAction(formData));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  const showDocFields = docType !== "";
  const showCiFields = docType === "ci";
  const idTypeLabel = t(`nationalIdTypes.${nationalIdType}`);

  return (
    <>
      <div className="guest-identity-form">
        <div className="guest-identity-form__status">
          <IdentityStatusPill status={guest.identity_status} t={t} />
        </div>

        {/* Document type */}
        <div className="guest-identity-form__section">
          <div className="guest-identity-form__section-row">
            <h4 className="guest-identity-form__section-title">{t("documentSection")}</h4>
            <button
              type="button"
              className="guest-identity-form__mrz-btn"
              onClick={() => setMrzOpen(true)}
            >
              {tMrz("scanButton")}
            </button>
          </div>
          <div className="guest-identity-form__row">
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("docType")}</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="guest-identity-form__select"
              >
                <option value="">{t("selectDocType")}</option>
                <option value="ci">{t("docTypes.ci")}</option>
                <option value="passport">{t("docTypes.passport")}</option>
                <option value="foreign_id">{t("docTypes.foreign_id")}</option>
                <option value="other">{t("docTypes.other")}</option>
              </select>
            </label>
          </div>

          {showDocFields && (
            <div className="guest-identity-form__row guest-identity-form__row--multi">
              {showCiFields && (
                <label className="guest-identity-form__field guest-identity-form__field--small">
                  <span className="guest-identity-form__label">{t("docSeries")}</span>
                  <input
                    type="text"
                    value={docSeries}
                    onChange={(e) => setDocSeries(e.target.value.toUpperCase())}
                    placeholder="XX"
                    maxLength={4}
                    className="guest-identity-form__input"
                  />
                </label>
              )}
              <label className="guest-identity-form__field">
                <span className="guest-identity-form__label">{t("docNumber")}</span>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={showCiFields ? "123456" : t("docNumberPlaceholder")}
                  className="guest-identity-form__input"
                />
              </label>
              <label className="guest-identity-form__field">
                <span className="guest-identity-form__label">{t("docIssuedBy")}</span>
                <input
                  type="text"
                  value={docIssuedBy}
                  onChange={(e) => setDocIssuedBy(e.target.value)}
                  placeholder={t("docIssuedByPlaceholder")}
                  className="guest-identity-form__input"
                />
              </label>
            </div>
          )}

          {showDocFields && (
            <div className="guest-identity-form__row guest-identity-form__row--multi">
              <label className="guest-identity-form__field">
                <span className="guest-identity-form__label">{t("docIssueDate")}</span>
                <input
                  type="date"
                  value={docIssueDate}
                  onChange={(e) => setDocIssueDate(e.target.value)}
                  className="guest-identity-form__input"
                />
              </label>
              <label className="guest-identity-form__field">
                <span className="guest-identity-form__label">{t("docExpiryDate")}</span>
                <input
                  type="date"
                  value={docExpiryDate}
                  onChange={(e) => setDocExpiryDate(e.target.value)}
                  className="guest-identity-form__input"
                />
              </label>
            </div>
          )}
        </div>

        {/* National ID — multi-country */}
        <div className="guest-identity-form__section">
          <h4 className="guest-identity-form__section-title">{t("personalSection")}</h4>

          <div className="guest-identity-form__row">
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{tRoot("phone")} *</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xx xxx xxx"
                className="guest-identity-form__input"
              />
            </label>
          </div>

          <div className="guest-identity-form__row guest-identity-form__row--multi">
            <label className="guest-identity-form__field guest-identity-form__field--small">
              <span className="guest-identity-form__label">{t("nationalIdType")}</span>
              <NationalIdTypePicker
                value={nationalIdType}
                onChange={handleNationalIdTypeChange}
                disabled={pending}
                labelForType={(type) => t(`nationalIdTypes.${type}`)}
              />
            </label>
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">
                {idTypeLabel}
                {idAutoFilled && (
                  <span className="guest-identity-form__auto-tag">{t("autoFilled")}</span>
                )}
              </span>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => handleNationalIdChange(e.target.value)}
                placeholder={t("nationalIdPlaceholder", { digits: expectedLength })}
                maxLength={expectedLength + 2}
                inputMode="numeric"
                className={[
                  "guest-identity-form__input",
                  idError && "guest-identity-form__input--error",
                ].filter(Boolean).join(" ")}
              />
              {idError && (
                <span className="guest-identity-form__error">{idError}</span>
              )}
              {idAutoFilled && birthDate ? (
                <span className="guest-identity-form__hint">
                  {t("birthDateFromId", { date: birthDate })}
                </span>
              ) : null}
              <span className="guest-identity-form__hint">
                {t("nationalIdHint", { type: idTypeLabel, digits: expectedLength })}
              </span>
            </label>
          </div>

          <div className="guest-identity-form__row guest-identity-form__row--multi">
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">
                {t("sex")}
                {idAutoFilled && sex && (
                  <span className="guest-identity-form__auto-tag">{t("fromId")}</span>
                )}
              </span>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "M" | "F" | "")}
                disabled={idAutoFilled}
                className="guest-identity-form__select"
              >
                <option value="">{t("selectSex")}</option>
                <option value="M">{t("sexM")}</option>
                <option value="F">{t("sexF")}</option>
              </select>
            </label>
            {!idAutoFilled ? (
              <label className="guest-identity-form__field">
                <span className="guest-identity-form__label">{t("birthDate")}</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="guest-identity-form__input"
                />
              </label>
            ) : null}
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("birthPlace")}</span>
              <input
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder={t("birthPlacePlaceholder")}
                className="guest-identity-form__input"
              />
            </label>
          </div>

          <div className="guest-identity-form__row guest-identity-form__row--multi">
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("nationality")}</span>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="România"
                className="guest-identity-form__input"
              />
            </label>
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("country")}</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="România"
                className="guest-identity-form__input"
              />
            </label>
          </div>
        </div>

        {/* Address */}
        <div className="guest-identity-form__section">
          <h4 className="guest-identity-form__section-title">{t("addressSection")}</h4>
          <div className="guest-identity-form__row">
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("address")}</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                className="guest-identity-form__input"
              />
            </label>
          </div>
          <div className="guest-identity-form__row guest-identity-form__row--multi">
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("city")}</span>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("cityPlaceholder")}
                className="guest-identity-form__input"
              />
            </label>
            <label className="guest-identity-form__field">
              <span className="guest-identity-form__label">{t("county")}</span>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="guest-identity-form__select"
              >
                <option value="">{t("selectCounty")}</option>
                {ROMANIAN_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="guest-identity-form__actions">
          {success && (
            <span className="guest-identity-form__success">{t("savedOk")}</span>
          )}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending || !!idError}
            className="guest-identity-form__submit"
          >
            {pending ? tCommon("saving") : t("save")}
          </button>
        </div>
      </div>

      <AdminAlertDialog
        open={error != null}
        title={t("errorTitle")}
        message={error ?? ""}
        onClose={() => setError(null)}
      />

      <MrzScanDialog
        open={mrzOpen}
        onClose={() => setMrzOpen(false)}
        onApply={applyMrzScan}
      />
    </>
  );
}

function IdentityStatusPill({
  status,
  t,
  compact = false,
}: {
  status: string;
  t: (key: string) => string;
  compact?: boolean;
}) {
  const cls = [
    "guest-identity-status",
    compact && "guest-identity-status--compact",
    status === "complete" && "guest-identity-status--complete",
    status === "partial" && "guest-identity-status--partial",
    status === "draft" && "guest-identity-status--draft",
  ]
    .filter(Boolean)
    .join(" ");

  const icon = status === "complete" ? "✓" : status === "partial" ? "○" : "−";
  const label = t(`status.${status}`);

  return (
    <span className={cls}>
      <span className="guest-identity-status__icon">{icon}</span>
      {label}
    </span>
  );
}

/** Exported for reuse in cards / badges */
export function GuestIdentityStatusPill({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const t = useTranslations("admin.guests.identity");
  return <IdentityStatusPill status={status} t={t} compact={compact} />;
}
