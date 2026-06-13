"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitGuestPrecheckinAction } from "@/app/[locale]/(guest-app)/stay/[code]/actions";
import type { GuestAccessBookingSnapshot } from "@/domain/guest-app/types";
import { mrzToPrecheckinFields, type MrzMappedIdentity } from "@/domain/guest/mrz";
import { GuestMrzScanDialog } from "@/features/guest-app/GuestMrzScanDialog";

type Props = {
  accessCode: string;
  booking: GuestAccessBookingSnapshot;
  alreadySubmitted: boolean;
};

export function GuestOnlineCheckinForm({
  accessCode,
  booking,
  alreadySubmitted,
}: Props) {
  const t = useTranslations("guestApp.precheckin");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);
  const [mrzOpen, setMrzOpen] = useState(false);
  const [phone, setPhone] = useState(booking.guestPhone ?? "");
  const [email, setEmail] = useState(booking.guestEmail ?? "");
  const [documentType, setDocumentType] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");

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
        phone,
        email,
        documentType: documentType || undefined,
        documentNumber,
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

  return (
    <>
      <form className="guest-app__form space-y-4" onSubmit={handleSubmit}>
        <p className="guest-app__subtle text-sm">{t("intro", { name: booking.guestName })}</p>

        <button
          type="button"
          className="guest-app__btn-secondary guest-app__mrz-trigger"
          onClick={() => setMrzOpen(true)}
        >
          {t("mrz.scanButton")}
        </button>

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
