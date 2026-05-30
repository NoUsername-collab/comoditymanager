"use client";

import { useActionState, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  previewGuestStayAction,
  submitGuestRequestAction,
} from "@/app/[locale]/(public)/calendar/actions";
import { GuestNameFields } from "@/components/calendar/GuestNameFields";
import { GuestStayOptionsPicker } from "@/components/calendar/GuestStayOptionsPicker";
import { DateWeekdayHint } from "@/components/ui/DateWeekdayHint";
import type {
  GuestStayOption,
  GuestStayPreview,
} from "@/domain/availability/guest-stay-options";
import { addDays, todayIso } from "@/lib/stay-dates";

type Props = {
  checkInTime: string;
  checkOutTime: string;
};

type Step = "dates" | "preview" | "contact";

export function GuestBookingForm({ checkInTime, checkOutTime }: Props) {
  const t = useTranslations("public.form");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<Step>("dates");
  const [hasMinor, setHasMinor] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [preview, setPreview] = useState<GuestStayPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GuestStayOption | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptGdpr, setAcceptGdpr] = useState(false);
  const [previewPending, startPreviewTransition] = useTransition();
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const today = todayIso();
  const minCheckOut = checkIn ? addDays(checkIn, 1) : "";

  function onCheckInChange(value: string) {
    setCheckIn(value);
    setPreview(null);
    setSelected(null);
    if (!value) {
      setCheckOut("");
      return;
    }
    const earliestOut = addDays(value, 1);
    if (!checkOut || checkOut <= value) {
      setCheckOut(earliestOut);
    }
  }

  function loadPreview() {
    setPreviewError(null);
    setPreview(null);
    setSelected(null);
    if (!checkIn || !checkOut) {
      setPreviewError(tErrors("pickDates"));
      return;
    }
    startPreviewTransition(async () => {
      const res = await previewGuestStayAction({
        check_in: checkIn,
        check_out: checkOut,
        num_adults: numAdults,
        num_children: numChildren,
      });
      if (!res.ok) {
        setPreviewError(res.error);
        return;
      }
      setPreview(res.preview);
      setStep("preview");
      if (res.preview.options.length === 1) {
        setSelected(res.preview.options[0]);
      }
    });
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { ok?: boolean; error?: string } | null, formData: FormData) => {
      try {
        await submitGuestRequestAction(formData);
        return { ok: true };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : tCommon("error"),
        };
      }
    },
    null
  );

  const linkTags = {
    link: (chunks: React.ReactNode) => (
      <Link href="/termeni" target="_blank" className="font-medium underline">
        {chunks}
      </Link>
    ),
  };

  const gdprLinkTags = {
    link: (chunks: React.ReactNode) => (
      <Link
        href="/confidentialitate"
        target="_blank"
        className="font-medium underline"
      >
        {chunks}
      </Link>
    ),
  };

  if (state?.ok) {
    return (
      <div className="public-notice public-notice--success p-6 text-center">
        <p className="text-lg font-semibold">{t("successTitle")}</p>
        <p className="mt-2 text-sm opacity-90">{t("successBody")}</p>
        {selected && (
          <p className="mt-3 text-xs opacity-80">
            {t.rich("successVariant", {
              title: selected.title,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        )}
      </div>
    );
  }

  const stepOrder: Step[] = ["dates", "preview", "contact"];
  const stepIndex = stepOrder.indexOf(step);

  const canSubmitContact =
    acceptTerms && acceptGdpr && selected && step === "contact";

  const steps: { key: Step; label: string }[] = [
    { key: "dates", label: t("stepDates") },
    { key: "preview", label: t("stepPreview") },
    { key: "contact", label: t("stepContact") },
  ];

  return (
    <div className="guest-booking-form site-card space-y-5 p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[var(--site-fg)]">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--site-muted)]">
          {t("checkTimes", { checkIn: checkInTime, checkOut: checkOutTime })}
        </p>
      </div>

      <ol className="public-step-track">
        {steps.map(({ key, label }, i) => (
          <li
            key={key}
            className={[
              "public-step-pill",
              step === key && "public-step-pill--active",
              stepIndex > i && "public-step-pill--done",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === "dates" && (
        <div className="space-y-4">
          <div className="guest-form-grid-2 grid grid-cols-2 gap-3">
            <label className="site-field">
              {t("checkIn")}
              <input
                type="date"
                required
                min={today}
                value={checkIn}
                onChange={(e) => onCheckInChange(e.target.value)}
                className="mt-1 w-full"
              />
              <DateWeekdayHint iso={checkIn} />
            </label>
            <label className="site-field">
              {t("checkOut")}
              <input
                type="date"
                required
                min={minCheckOut || undefined}
                value={checkOut}
                disabled={!checkIn}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setPreview(null);
                  setSelected(null);
                }}
                className="mt-1 w-full"
              />
              <DateWeekdayHint iso={checkOut} />
            </label>
          </div>

          <div className="guest-form-grid-2 grid grid-cols-2 gap-3">
            <label className="site-field">
              {t("adults")}
              <input
                type="number"
                min={1}
                required
                value={numAdults}
                onChange={(e) => {
                  setNumAdults(Number(e.target.value) || 1);
                  setPreview(null);
                  setSelected(null);
                }}
                className="mt-1 w-full"
              />
            </label>
            <label className="site-field">
              {t("children")}
              <input
                type="number"
                min={0}
                value={numChildren}
                onChange={(e) => {
                  setNumChildren(Number(e.target.value) || 0);
                  setPreview(null);
                  setSelected(null);
                }}
                className="mt-1 w-full"
              />
            </label>
          </div>

          {previewError && (
            <p className="text-sm text-red-600">{previewError}</p>
          )}

          <button
            type="button"
            onClick={loadPreview}
            disabled={previewPending || !checkIn || !checkOut}
            className="site-cta w-full justify-center py-2.5 disabled:opacity-50"
          >
            {previewPending ? t("previewLoading") : t("previewButton")}
          </button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <GuestStayOptionsPicker
            preview={preview}
            selectedId={selected?.option_id ?? null}
            onSelect={(opt) => setSelected(opt)}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep("dates")}
              className="site-btn-secondary"
            >
              {t("changeDates")}
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => setStep("contact")}
              className="site-cta flex-1 justify-center py-2.5 disabled:opacity-50"
            >
              {t("continue")}
            </button>
          </div>
        </div>
      )}

      {step === "contact" && selected && preview && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="check_in" value={checkIn} />
          <input type="hidden" name="check_out" value={checkOut} />
          <input type="hidden" name="num_adults" value={numAdults} />
          <input type="hidden" name="num_children" value={numChildren} />
          <input
            type="hidden"
            name="selected_option_id"
            value={selected.option_id}
          />

          <div className="public-summary-box">
            <p className="public-summary-box__title">{t("summaryTitle")}</p>
            <p className="public-summary-box__meta">{selected.title}</p>
            <p className="public-summary-box__meta">
              {t("estimate", {
                total: selected.total_estimate_ron,
                nights: selected.nights,
              })}
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[var(--site-accent)] underline"
              onClick={() => setStep("preview")}
            >
              {t("changeVariant")}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--site-fg)]">
            <input
              type="checkbox"
              name="has_minor"
              checked={hasMinor}
              onChange={(e) => setHasMinor(e.target.checked)}
              className="rounded"
            />
            {t("hasMinor")}
          </label>

          {hasMinor && (
            <label className="site-field">
              {t("minorAge")}
              <input
                name="minor_age"
                placeholder={t("minorAgePlaceholder")}
                className="mt-1 w-full"
              />
            </label>
          )}

          <GuestNameFields
            lastName={guestLastName}
            firstName={guestFirstName}
            onLastNameChange={setGuestLastName}
            onFirstNameChange={setGuestFirstName}
          />
          <label className="site-field">
            {tCommon("email")} *
            <input
              name="guest_email"
              type="email"
              required
              className="mt-1 w-full"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </label>
          <label className="site-field">
            {tCommon("phone")} *
            <input
              name="guest_phone"
              type="tel"
              required
              className="mt-1 w-full"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
          </label>
          <label className="site-field">
            {t("messageOptional")}
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full"
            />
          </label>

          <div className="space-y-2 rounded-lg border border-[var(--site-border)] bg-[var(--site-bg)]/50 p-3 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="accept_terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded"
                required
              />
              <span>{t.rich("acceptTerms", linkTags)}</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="accept_gdpr"
                checked={acceptGdpr}
                onChange={(e) => setAcceptGdpr(e.target.checked)}
                className="mt-0.5 rounded"
                required
              />
              <span>{t.rich("acceptGdpr", gdprLinkTags)}</span>
            </label>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep("preview")}
              className="site-btn-secondary"
            >
              {t("back")}
            </button>
            <button
              type="submit"
              disabled={pending || !canSubmitContact}
              className="site-cta flex-1 justify-center py-2.5 disabled:opacity-50"
            >
              {pending ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
