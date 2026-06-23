"use client";

import { useActionState, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  previewGuestStayAction,
  submitGuestRequestAction,
} from "@/app/[locale]/(public)/calendar/actions";
import { GuestNameFields } from "@/components/calendar/GuestNameFields";
import { RoomSelectionWithGuard } from "@/components/calendar/RoomSelectionWithGuard";
import { DateWeekdayHint } from "@/components/ui/DateWeekdayHint";
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

  const today = todayIso();
  const defaultDates = defaultNewStayDates(today);

  const [step, setStep] = useState<Step>("dates");
  const [hasMinor, setHasMinor] = useState(false);
  const [checkIn, setCheckIn] = useState(defaultDates.checkIn);
  const [checkOut, setCheckOut] = useState(defaultDates.checkOut);
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [preview, setPreview] = useState<GuestStayPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptGdpr, setAcceptGdpr] = useState(false);
  const [previewPending, startPreviewTransition] = useTransition();
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const minCheckOut = checkIn ? addDays(checkIn, 1) : "";

  function onCheckInChange(value: string) {
    const nextCheckIn = clampCheckInDate(value, today);
    setCheckIn(nextCheckIn);
    setPreview(null);
    setSelectedRoomIds([]);
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
    setPreview(null);
    setSelectedRoomIds([]);
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
        {selectedRoomIds.length > 0 && (
          <p className="mt-3 text-xs opacity-80">
            {t("successRooms", { count: selectedRoomIds.length, defaultValue: `Rooms selected: ${selectedRoomIds.length}` })}
          </p>
        )}
      </div>
    );
  }

  const stepOrder: Step[] = ["dates", "rooms", "contact"];
  const stepIndex = stepOrder.indexOf(step);

  const canSubmitContact =
    acceptTerms && acceptGdpr && selectedRoomIds.length > 0 && step === "contact";

  const steps: { key: Step; label: string }[] = [
    { key: "dates", label: t("stepDates") },
    { key: "rooms", label: t("stepRooms", { defaultValue: "Select Rooms" }) },
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
                  setPreview(null);
                  setSelectedRoomIds([]);
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
                  setSelectedRoomIds([]);
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
                  setSelectedRoomIds([]);
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

      {step === "rooms" && preview && (
        <RoomSelectionWithGuard
          preview={preview}
          onComplete={(selectedIds) => {
            setSelectedRoomIds(selectedIds);
            setStep("contact");
          }}
          onCancel={() => setStep("dates")}
        />
      )}

      {step === "contact" && selectedRoomIds.length > 0 && preview && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="check_in" value={checkIn} />
          <input type="hidden" name="check_out" value={checkOut} />
          <input type="hidden" name="num_adults" value={numAdults} />
          <input type="hidden" name="num_children" value={numChildren} />
          <input
            type="hidden"
            name="selected_room_ids"
            value={selectedRoomIds.join(",")}
          />

          <div className="public-summary-box">
            <p className="public-summary-box__title">{t("summaryTitle")}</p>
            <p className="public-summary-box__meta">
              {selectedRoomIds.length} room{selectedRoomIds.length !== 1 ? "s" : ""} selected
            </p>
            <p className="public-summary-box__meta">
              {checkIn} → {checkOut} ({preview?.nights || 0} nights)
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[var(--site-accent)] underline"
              onClick={() => setStep("rooms")}
            >
              {t("changeRooms", { defaultValue: "Change rooms" })}
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
