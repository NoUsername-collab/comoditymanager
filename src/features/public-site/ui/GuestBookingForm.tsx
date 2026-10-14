"use client";

import { useActionState, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  previewGuestStayAction,
  submitGuestRequestAction,
} from "@/features/public-site/calendar-actions";
import {
  BookingIdentityPanel,
  useBookingIdentity,
} from "@/features/bookings/ui/identity";
import { GuestStayOptionPicker } from "@/features/public-site/ui/GuestStayOptionPicker";
import {
  PartyFields,
  PartyHiddenInputs,
} from "@/features/bookings/ui/party/PartyFields";
import {
  buildParty,
  partyAgesComplete,
  type Party,
} from "@/domain/availability/party";
import { DateWeekdayHint } from "@/components/ui/DateWeekdayHint";
import { DEFAULT_PARTY_ADULTS } from "@/lib/constants";
import type {
  GuestStayOption,
  GuestStayPreview,
} from "@/domain/availability/guest-stay-options";
import {
  addDays,
  clampCheckInDate,
  defaultNewStayDates,
  todayIso,
} from "@/lib/stay-dates";

type Props = {
  checkInTime: string;
  checkOutTime: string;
};

type Step = "dates" | "rooms" | "contact";

export function GuestBookingForm({ checkInTime, checkOutTime }: Props) {
  const t = useTranslations("public.form");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const tParty = useTranslations("party");

  const today = todayIso();
  const defaultDates = defaultNewStayDates(today);

  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState(defaultDates.checkIn);
  const [checkOut, setCheckOut] = useState(defaultDates.checkOut);
  const [party, setParty] = useState<Party>(() =>
    buildParty({ adults: DEFAULT_PARTY_ADULTS, childAges: [] }),
  );
  const [preview, setPreview] = useState<GuestStayPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<GuestStayOption | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptGdpr, setAcceptGdpr] = useState(false);
  const [previewPending, startPreviewTransition] = useTransition();
  const identity = useBookingIdentity({ lookup: false, emailRequired: true });

  const minCheckOut = checkIn ? addDays(checkIn, 1) : "";

  function resetPreview() {
    setPreview(null);
    setSelectedOption(null);
  }

  function onPartyChange(next: Party) {
    setParty(next);
    resetPreview();
  }

  function onCheckInChange(value: string) {
    const nextCheckIn = clampCheckInDate(value, today);
    setCheckIn(nextCheckIn);
    resetPreview();
    if (!nextCheckIn) {
      setCheckOut("");
      return;
    }
    const earliestOut = addDays(nextCheckIn, 1);
    if (!checkOut || checkOut <= nextCheckIn) {
      setCheckOut(earliestOut);
    }
  }

  function loadPreview() {
    setPreviewError(null);
    resetPreview();
    if (!checkIn || !checkOut) {
      setPreviewError(tErrors("pickDates"));
      return;
    }
    if (!partyAgesComplete(party)) {
      setPreviewError(tParty("agesRequired"));
      return;
    }
    startPreviewTransition(async () => {
      const res = await previewGuestStayAction({
        check_in: checkIn,
        check_out: checkOut,
        party,
      });
      if (!res.ok) {
        setPreviewError(res.error);
        return;
      }
      setPreview(res.preview);
      setStep("rooms");
    });
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: { ok?: boolean; error?: string } | null, formData: FormData) => {
      try {
        const result = await submitGuestRequestAction(formData);
        if (!result.ok) {
          return { error: result.error };
        }
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
      <div className="public-notice public-notice--success p-4 text-center">
        <p className="text-lg font-semibold">{t("successTitle")}</p>
        <p className="mt-2 text-sm opacity-90">{t("successBody")}</p>
        {selectedOption && (
          <p className="mt-3 text-xs opacity-80">
            {t("successRooms", { count: selectedOption.rooms.length })}
          </p>
        )}
      </div>
    );
  }

  const stepOrder: Step[] = ["dates", "rooms", "contact"];
  const stepIndex = stepOrder.indexOf(step);

  const canSubmitContact =
    acceptTerms &&
    acceptGdpr &&
    selectedOption != null &&
    step === "contact" &&
    identity.canSubmit;

  const steps: { key: Step; label: string }[] = [
    { key: "dates", label: t("stepDates") },
    { key: "rooms", label: t("stepRooms") },
    { key: "contact", label: t("stepContact") },
  ];

  return (
    <div className="guest-booking-form site-card space-y-4 p-4 shadow-sm">
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
                  resetPreview();
                }}
                className="mt-1 w-full"
              />
              <DateWeekdayHint iso={checkOut} />
            </label>
          </div>

          <PartyFields value={party} onChange={onPartyChange} appearance="public" />

          {previewError && (
            <p className="text-sm text-red-600">{previewError}</p>
          )}

          <button
            type="button"
            onClick={loadPreview}
            disabled={previewPending || !checkIn || !checkOut || !partyAgesComplete(party)}
            className="site-cta w-full justify-center py-2.5 disabled:opacity-50"
          >
            {previewPending ? t("previewLoading") : t("previewButton")}
          </button>
        </div>
      )}

      {step === "rooms" && preview && (
        <GuestStayOptionPicker
          preview={preview}
          selectedOptionId={selectedOption?.option_id ?? null}
          onSelect={(option) => {
            setSelectedOption(option);
            setStep("contact");
          }}
          onBack={() => setStep("dates")}
        />
      )}

      {step === "contact" && selectedOption && preview && (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!identity.canSubmit) event.preventDefault();
          }}
          className="space-y-4"
        >
          <input type="hidden" name="check_in" value={checkIn} />
          <input type="hidden" name="check_out" value={checkOut} />
          <PartyHiddenInputs party={party} />
          <input
            type="hidden"
            name="selected_option_id"
            value={selectedOption.option_id}
          />

          <div className="public-summary-box">
            <p className="public-summary-box__title">{t("summaryTitle")}</p>
            <p className="public-summary-box__meta">
              {selectedOption.rooms.map((room) => room.name).join(", ")}
            </p>
            <p className="public-summary-box__meta">
              {t("estimate", {
                total: selectedOption.total_estimate_ron,
                nights: preview.nights,
              })}
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[var(--site-accent)] underline"
              onClick={() => setStep("rooms")}
            >
              {t("changeVariant")}
            </button>
          </div>

          <BookingIdentityPanel identity={identity} appearance="public" />
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
              onClick={() => setStep("rooms")}
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
