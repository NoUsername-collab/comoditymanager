"use client";

import { useRouter } from "@/i18n/navigation";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  submitPhoneBookingAction,
  suggestExistingGuestAction,
} from "@/app/[locale]/(public)/calendar/actions";
import { GuestNameFields } from "@/components/calendar/GuestNameFields";
import { DateWeekdayHint } from "@/components/ui/DateWeekdayHint";
import { addDays, todayIso } from "@/lib/stay-dates";

export function PhoneBookingForm({
  checkInTime,
  checkOutTime,
}: {
  checkInTime: string;
  checkOutTime: string;
}) {
  const router = useRouter();
  const t = useTranslations("public.phoneForm");
  const tForm = useTranslations("public.form");
  const tCommon = useTranslations("common");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [identityHint, setIdentityHint] = useState<string | null>(null);
  const [identityHintTone, setIdentityHintTone] = useState<"neutral" | "warn">("neutral");
  const [identityPending, startIdentityTransition] = useTransition();
  const today = todayIso();
  const minCheckOut = checkIn ? addDays(checkIn, 1) : "";

  function onCheckInChange(value: string) {
    setCheckIn(value);
    if (!value) {
      setCheckOut("");
      return;
    }
    const earliestOut = addDays(value, 1);
    if (!checkOut || checkOut <= value) setCheckOut(earliestOut);
  }

  function maybeAutofillGuest() {
    const hasIdentity =
      guestEmail.trim().length > 0 ||
      guestPhone.trim().length > 0 ||
      (guestLastName.trim().length > 1 && guestFirstName.trim().length > 1);
    if (!hasIdentity) return;
    startIdentityTransition(async () => {
      const res = await suggestExistingGuestAction({
        guest_last_name: guestLastName,
        guest_first_name: guestFirstName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
      });
      if (!res.ok || !res.match) return;
      setGuestLastName(res.match.lastName);
      setGuestFirstName(res.match.firstName);
      setGuestEmail(res.match.email ?? guestEmail);
      setGuestPhone(res.match.phone ?? guestPhone);
      if (res.match.flagLevel === "blacklist") {
        setIdentityHintTone("warn");
        setIdentityHint(tForm("existingGuestBlacklist", { name: res.match.displayName }));
      } else if (res.match.flagLevel === "watchlist") {
        setIdentityHintTone("warn");
        setIdentityHint(tForm("existingGuestWatchlist", { name: res.match.displayName }));
      } else {
        setIdentityHintTone("neutral");
        setIdentityHint(tForm("existingGuestFound", { name: res.match.displayName }));
      }
    });
  }

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { ok?: boolean; error?: string; saved?: boolean } | null,
      formData: FormData
    ) => {
      try {
        const result = await submitPhoneBookingAction(formData);
        if (result.redirectConfirm && result.bookingId) {
          router.push(`/calendar/confirm/${result.bookingId}`);
          return { ok: true };
        }
        return { ok: true, saved: true };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : tCommon("error"),
        };
      }
    },
    null
  );

  if (state?.ok && state.saved) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {t("savedDetail")}
      </p>
    );
  }

  return (
    <form action={formAction} className="phone-booking-form space-y-3 text-sm">
      <p className="text-xs text-zinc-500">
        {t("receptionHours", { checkIn: checkInTime, checkOut: checkOutTime })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label>
          {tForm("checkIn").replace(" *", "")}
          <input
            name="check_in"
            type="date"
            required
            min={today}
            value={checkIn}
            onChange={(e) => onCheckInChange(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
          <DateWeekdayHint iso={checkIn} />
        </label>
        <label>
          {tForm("checkOut").replace(" *", "")}
          <input
            name="check_out"
            type="date"
            required
            min={minCheckOut || undefined}
            value={checkOut}
            disabled={!checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 disabled:bg-zinc-100"
          />
          <DateWeekdayHint iso={checkOut} />
        </label>
      </div>
      <GuestNameFields
        compact
        lastName={guestLastName}
        firstName={guestFirstName}
        onLastNameChange={(value) => {
          setGuestLastName(value);
          if (identityHint) setIdentityHint(null);
        }}
        onFirstNameChange={(value) => {
          setGuestFirstName(value);
          if (identityHint) setIdentityHint(null);
        }}
        onIdentityBlur={maybeAutofillGuest}
      />
      <div className="grid grid-cols-2 gap-2">
        <label>
          {tCommon("phone")} *
          <input
            name="guest_phone"
            type="tel"
            required
            value={guestPhone}
            onChange={(e) => {
              setGuestPhone(e.target.value);
              if (identityHint) setIdentityHint(null);
            }}
            onBlur={maybeAutofillGuest}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
        </label>
        <label>
          {t("emailOptional")}
          <input
            name="guest_email"
            type="email"
            value={guestEmail}
            onChange={(e) => {
              setGuestEmail(e.target.value);
              if (identityHint) setIdentityHint(null);
            }}
            onBlur={maybeAutofillGuest}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
        </label>
      </div>
      {(identityPending || identityHint) && (
        <p
          className={identityHintTone === "warn" ? "text-xs text-amber-700" : "text-xs text-zinc-500"}
          aria-live="polite"
        >
          {identityPending ? tForm("checkingExistingGuest") : identityHint}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label>
          {tForm("adults").replace(" *", "")}
          <input name="num_adults" type="number" min={1} defaultValue={2} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5" />
        </label>
        <label>
          {tForm("children")}
          <input name="num_children" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5" />
        </label>
      </div>
      <label className="block">
        {t("notesLabel")}
        <input name="notes" placeholder={t("notesPlaceholder")} className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5" />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="confirm_now" className="rounded" />
        {t("confirmAllocate")}
      </label>
      {state?.error && <p className="text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
      >
        {pending ? t("saving") : t("submit")}
      </button>
    </form>
  );
}
