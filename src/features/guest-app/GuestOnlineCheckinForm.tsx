"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitGuestPrecheckinAction } from "@/app/[locale]/(guest-app)/stay/[code]/actions";
import type { GuestAccessBookingSnapshot } from "@/domain/guest-app/types";
import type { GuestPrecheckinPrefill } from "@/domain/guest-app/precheckin-prefill";
import { mrzToPrecheckinFields, type MrzMappedIdentity } from "@/domain/guest/mrz";
import { GuestMrzScanDialog } from "@/features/guest-app/GuestMrzScanDialog";

type Props = {
  accessCode: string;
  booking: GuestAccessBookingSnapshot;
  prefill: GuestPrecheckinPrefill;
  alreadySubmitted: boolean;
};

export function GuestOnlineCheckinForm({
  accessCode,
  booking,
  prefill,
  alreadySubmitted,
}: Props) {
  const t = useTranslations("guestApp.precheckin");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);
  const [mrzOpen, setMrzOpen] = useState(false);

  const [lastName, setLastName] = useState(prefill.lastName);
  const [firstName, setFirstName] = useState(prefill.firstName);
  const [phone, setPhone] = useState(prefill.phone);
  const [email, setEmail] = useState(prefill.email);
  const [documentType, setDocumentType] = useState(prefill.documentType);
  const [documentNumber, setDocumentNumber] = useState(prefill.documentNumber);
  const [nationalId, setNationalId] = useState(prefill.nationalId);
  const [birthDate, setBirthDate] = useState(prefill.birthDate ?? "");
  const [nationality, setNationality] = useState(prefill.nationality);
  const [notes, setNotes] = useState(prefill.notes);

  if (submitted) {
    return (
      <div className="guest-app__success-box">
        <p className="font-semibold">{t("successTitle")}</p>
        <p className="mt-2 text-sm opacity-90">{t("successBody")}</p>
      </div>
    );
  }

  function applyMrzScan(data: MrzMappedIdentity) {
    const fields = mrzToPrecheckinFields(data);
    if (fields.documentType) setDocumentType(fields.documentType);
    if (fields.documentNumber) setDocumentNumber(fields.documentNumber);
    if (data.lastName) setLastName(data.lastName);
    if (data.firstName) setFirstName(data.firstName);
    if (data.nationalId) setNationalId(data.nationalId);
    if (data.birthDate) setBirthDate(data.birthDate);
    if (data.nationality) setNationality(data.nationality);
    if (fields.notesAppend) {
      setNotes((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}\n${fields.notesAppend}` : fields.notesAppend;
      });
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitGuestPrecheckinAction({
        accessCode,
        lastName,
        firstName,
        phone,
        email,
        documentType: documentType || undefined,
        documentNumber,
        nationalId,
        birthDate: birthDate || undefined,
        nationality,
        notes,
      });
      if (!result.ok) {
        const key = result.error as "errors.generic";
        setError(t.has(key) ? t(key) : result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  const displayName =
    [lastName, firstName].filter(Boolean).join(" ").trim() || booking.guestName;

  return (
    <>
      <form className="guest-app__form space-y-4" onSubmit={handleSubmit}>
        <p className="guest-app__subtle text-sm">{t("intro", { name: displayName })}</p>
        {prefill.hasGuestProfile ? (
          <p className="guest-app__subtle text-sm">{t("prefillFromProfile")}</p>
        ) : null}

        <button
          type="button"
          className="guest-app__btn-secondary guest-app__mrz-trigger"
          onClick={() => setMrzOpen(true)}
        >
          {t("mrz.scanButton")}
        </button>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("lastName")}</span>
            <input
              className="guest-app__field__input"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("firstName")}</span>
            <input
              className="guest-app__field__input"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
        </div>

        <label className="guest-app__field">
          <span className="guest-app__field__label">{t("phone")}</span>
          <input
            className="guest-app__field__input"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="guest-app__field">
          <span className="guest-app__field__label">{t("email")}</span>
          <input
            className="guest-app__field__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="guest-app__field">
          <span className="guest-app__field__label">{t("nationalId")}</span>
          <input
            className="guest-app__field__input"
            inputMode="numeric"
            autoComplete="off"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\s/g, ""))}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("birthDate")}</span>
            <input
              className="guest-app__field__input"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("nationality")}</span>
            <input
              className="guest-app__field__input"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("documentType")}</span>
            <select
              className="guest-app__field__input"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="">{t("documentOptional")}</option>
              <option value="ci">{t("documentCi")}</option>
              <option value="pasaport">{t("documentPassport")}</option>
              <option value="permis">{t("documentPermit")}</option>
            </select>
          </label>
          <label className="guest-app__field">
            <span className="guest-app__field__label">{t("documentNumber")}</span>
            <input
              className="guest-app__field__input"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          </label>
        </div>

        <label className="guest-app__field">
          <span className="guest-app__field__label">{t("notes")}</span>
          <textarea
            className="guest-app__field__input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error ? <p className="guest-app__form-error">{error}</p> : null}

        <button type="submit" className="guest-app__btn-primary" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>

      <GuestMrzScanDialog
        open={mrzOpen}
        onClose={() => setMrzOpen(false)}
        onApply={applyMrzScan}
      />
    </>
  );
}
