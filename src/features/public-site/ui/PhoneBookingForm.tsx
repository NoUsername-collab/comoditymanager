"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createStaffStayAction, type StaffStayIntent } from "@/features/bookings/staff-stay-actions";
import {
  BookingIdentityPanel,
  useBookingIdentity,
} from "@/features/bookings/ui/identity";
import {
  StaffStayIntentToggle,
  StaffStayOccupancyFields,
  StaffStayRoomPicker,
  useStaffStayPreview,
} from "@/features/bookings/ui/staff-stay-create";
import { DateWeekdayHint } from "@/components/ui/DateWeekdayHint";
import {
  addDays,
  clampCheckInDate,
  defaultNewStayDates,
  todayIso,
} from "@/lib/stay-dates";

export function PhoneBookingForm({
  checkInTime,
  checkOutTime,
}: {
  checkInTime: string;
  checkOutTime: string;
}) {
  const t = useTranslations("public.phoneForm");
  const tForm = useTranslations("public.form");
  const today = todayIso();
  const defaultDates = defaultNewStayDates(today);
  const [checkIn, setCheckIn] = useState(defaultDates.checkIn);
  const [checkOut, setCheckOut] = useState(defaultDates.checkOut);
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [intent, setIntent] = useState<StaffStayIntent>("cerere");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIntent, setSavedIntent] = useState<StaffStayIntent | null>(null);
  const identity = useBookingIdentity();
  const minCheckOut = checkIn ? addDays(checkIn, 1) : "";
  const preferredRoomIds = useMemo(() => [], []);
  const stayPreview = useStaffStayPreview({
    checkIn,
    checkOut,
    numAdults,
    numChildren,
    preferredRoomIds,
    enabled: Boolean(checkIn && checkOut && checkIn < checkOut),
  });

  function onCheckInChange(value: string) {
    const nextCheckIn = clampCheckInDate(value, today);
    setCheckIn(nextCheckIn);
    if (!nextCheckIn) {
      setCheckOut("");
      return;
    }
    const earliestOut = addDays(nextCheckIn, 1);
    if (!checkOut || checkOut <= nextCheckIn) setCheckOut(earliestOut);
  }

  async function onSubmit() {
    if (!identity.canSubmit) return;
    if (!stayPreview.quote.hostsGuests) {
      setError(t("roomsRequired"));
      return;
    }
    setPending(true);
    setError(null);
    const res = await createStaffStayAction({
      intent,
      roomIds: stayPreview.selectedIds,
      checkIn,
      checkOut,
      guestLastName: identity.guestLastName,
      guestFirstName: identity.guestFirstName,
      guestEmail: identity.guestEmail,
      guestPhone: identity.guestPhone,
      numAdults,
      numChildren,
      notes: notes.trim() || undefined,
      source: "reception",
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSavedIntent(intent);
  }

  if (savedIntent) {
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {savedIntent === "direct" ? t("savedDirect") : t("savedDetail")}
      </p>
    );
  }

  return (
    <form
      className="phone-booking-form space-y-3 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!identity.canSubmit) return;
        void onSubmit();
      }}
    >
      <p className="text-xs text-zinc-500">
        {t("receptionHours", { checkIn: checkInTime, checkOut: checkOutTime })}
      </p>
      <StaffStayIntentToggle
        value={intent}
        onChange={setIntent}
        appearance="reception"
      />
      <div className="grid grid-cols-2 gap-2">
        <label>
          {tForm("checkIn").replace(" *", "")}
          <input
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
      <StaffStayOccupancyFields
        numAdults={numAdults}
        numChildren={numChildren}
        onAdultsChange={setNumAdults}
        onChildrenChange={setNumChildren}
        appearance="reception"
      />
      <StaffStayRoomPicker
        rooms={stayPreview.rooms}
        quote={stayPreview.quote}
        pending={stayPreview.pending}
        previewError={stayPreview.error}
        onToggle={stayPreview.toggleRoom}
        appearance="reception"
      />
      <BookingIdentityPanel identity={identity} appearance="compact" />
      <label className="block">
        {t("notesLabel")}
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        />
      </label>
      {error ? <p className="text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={
          pending ||
          stayPreview.pending ||
          !identity.canSubmit ||
          !stayPreview.quote.hostsGuests
        }
        className="phone-booking-form__submit min-h-[var(--ml-touch-min,2.75rem)] w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending
          ? t("saving")
          : !identity.identityChecksReady
            ? identity.checkingLabel
            : intent === "direct"
              ? t("submitDirect")
              : t("submit")}
      </button>
    </form>
  );
}
