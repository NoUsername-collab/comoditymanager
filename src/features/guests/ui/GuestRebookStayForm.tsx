"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminTextarea } from "@/components/admin/ui/AdminInput";
import { RoomFeatureBadges } from "@/features/rooms/ui/RoomFeatureBadges";
import {
  previewGuestRebookRoomsAction,
  submitGuestRebookStayAction,
} from "@/features/guests/rebook-actions";
import type { GuestRebookDraft } from "@/services/guest-rebook";
import type { ConfirmRoomOption } from "@/services/booking-confirm";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { addDays, clampCheckInDate, todayIso } from "@/lib/stay-dates";
import { stayNightCount } from "@/lib/stay-dates";
import type { SharedInventory } from "@/domain/availability/stay-capacity";
import { quoteStay } from "@/domain/availability/stay-quote";
import type { StayPricingRules } from "@/domain/settings/booking-rules";
import {
  partyAgesComplete,
  partyHeadcount,
  type ChildPolicy,
  type Party,
} from "@/domain/availability/party";
import {
  PartyFields,
  PartyHiddenInputs,
} from "@/features/bookings/ui/party/PartyFields";

type Props = {
  draft: GuestRebookDraft;
  initialRooms: ConfirmRoomOption[];
  initialCanFulfill: boolean;
  initialMinRooms: number;
  childPolicy: ChildPolicy;
  inventory: SharedInventory;
  pricingRules: StayPricingRules;
  checkInTime: string;
  checkOutTime: string;
  /** Pagină dedicată: link înapoi. În colaps: folosește onCancel. */
  backHref?: string;
  embedded?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  today?: string;
};

function formatCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function GuestRebookStayForm({
  draft,
  initialRooms,
  initialCanFulfill,
  initialMinRooms,
  childPolicy: initialChildPolicy,
  inventory: initialInventory,
  pricingRules: initialPricingRules,
  checkInTime,
  checkOutTime,
  backHref,
  embedded = false,
  compact = false,
  onCancel,
  today: todayProp,
}: Props) {
  const t = useTranslations("admin.pages.guestRebook");
  const tConfirm = useTranslations("admin.confirmRooms");
  const tParty = useTranslations("party");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();

  const today = todayProp ?? todayIso();
  const initialDates = (() => {
    const checkIn = clampCheckInDate(draft.checkIn || today, today);
    const checkOut =
      draft.checkOut && draft.checkOut > checkIn
        ? draft.checkOut
        : addDays(checkIn, 1);
    return { checkIn, checkOut };
  })();
  const [checkIn, setCheckIn] = useState(initialDates.checkIn);
  const [checkOut, setCheckOut] = useState(initialDates.checkOut);
  const [guestLastName, setGuestLastName] = useState(draft.guestLastName);
  const [guestFirstName, setGuestFirstName] = useState(draft.guestFirstName);
  const [guestEmail, setGuestEmail] = useState(draft.guestEmail);
  const [guestPhone, setGuestPhone] = useState(draft.guestPhone);
  const [party, setParty] = useState<Party>(draft.party);
  const [childPolicy, setChildPolicy] = useState(initialChildPolicy);
  const [inventory, setInventory] = useState(initialInventory);
  const [pricingRules, setPricingRules] = useState(initialPricingRules);
  const [notes, setNotes] = useState(draft.notes);

  const [availableRooms, setAvailableRooms] = useState(initialRooms);
  const [canFulfill, setCanFulfill] = useState(initialCanFulfill);
  const [minRoomsNeeded, setMinRoomsNeeded] = useState(initialMinRooms);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const validDefaults = draft.defaultRoomIds.filter((id) =>
    initialRooms.some((r) => r.id === id)
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(validDefaults));

  const [previewPending, startPreview] = useTransition();
  const invalidInterval = !checkIn || !checkOut || checkOut <= checkIn;
  const guestCount = partyHeadcount(party);
  const agesComplete = partyAgesComplete(party);
  const partyKey = JSON.stringify(party);
  const nights = !invalidInterval ? stayNightCount(checkIn, checkOut) : 0;

  const refreshRooms = useCallback(() => {
    if (invalidInterval || !agesComplete) {
      setAvailableRooms([]);
      setCanFulfill(false);
      setMinRoomsNeeded(0);
      return;
    }
    startPreview(async () => {
      const res = await previewGuestRebookRoomsAction({
        check_in: checkIn,
        check_out: checkOut,
        party: JSON.parse(partyKey) as Party,
      });
      if (!res.ok) {
        setRoomsError(tErrors("pickDates"));
        setAvailableRooms([]);
        setCanFulfill(false);
        return;
      }
      setRoomsError(null);
      setChildPolicy(res.rooms.childPolicy);
      setInventory(res.rooms.inventory);
      setPricingRules(res.rooms.pricingRules);
      setAvailableRooms(res.rooms.availableRooms);
      setCanFulfill(res.rooms.canFulfill);
      setMinRoomsNeeded(res.rooms.minRoomsNeeded);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (res.rooms.availableRooms.some((r) => r.id === id)) next.add(id);
        }
        return next;
      });
    });
  }, [checkIn, checkOut, partyKey, agesComplete, invalidInterval, tErrors]);

  useEffect(() => {
    const timer = window.setTimeout(refreshRooms, 280);
    return () => window.clearTimeout(timer);
  }, [refreshRooms]);

  const selectedRooms = useMemo(
    () => availableRooms.filter((r) => selected.has(r.id)),
    [availableRooms, selected]
  );

  // Same quote as the server: rooms, extra beds and cots, child rules and free stock.
  const quote = useMemo(
    () =>
      nights > 0
        ? quoteStay({
            rooms: selectedRooms,
            party,
            policy: childPolicy,
            inventory,
            checkIn,
            checkOut,
            pricingRules,
          })
        : null,
    [selectedRooms, party, childPolicy, inventory, checkIn, checkOut, nights, pricingRules]
  );
  const standardTotal = quote?.total ?? 0;

  const selectionHostsGuests = quote != null;
  const noRoomsAvailable = availableRooms.length === 0;
  const showGlobalUnavailable =
    !invalidInterval && (!canFulfill || noRoomsAvailable);
  const showSelectionError =
    canFulfill && selected.size > 0 && !selectionHostsGuests;

  const canSubmit =
    !invalidInterval &&
    guestPhone.trim().length > 0 &&
    guestLastName.trim().length > 0 &&
    agesComplete &&
    (selected.size === 0 ||
      (canFulfill &&
        selectionHostsGuests &&
        selected.size > 0 &&
        !noRoomsAvailable));

  function onCheckInChange(value: string) {
    const nextCheckIn = clampCheckInDate(value, today);
    setCheckIn(nextCheckIn);
    if (!nextCheckIn) {
      setCheckOut("");
      return;
    }
    const earliestOut = addDays(nextCheckIn, 1);
    if (!checkOut || checkOut <= nextCheckIn) {
      setCheckOut(earliestOut);
    }
  }

  function toggleRoom(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const formClass = [
    "guest-rebook-form space-y-4",
    embedded && "guest-rebook-form--embedded",
    compact && "guest-rebook-form--compact",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AdminPendingForm action={submitGuestRebookStayAction} className={formClass}>
      <input type="hidden" name="guest_id" value={draft.guestId} />
      <input type="hidden" name="source_booking_id" value={draft.sourceBookingId} />

      {!embedded && (
        <p className="guest-rebook-form__intro text-sm text-zinc-600">
          {t("intro", {
            period: formatStayPeriod(
              draft.sourceCheckIn,
              draft.sourceCheckOut,
              locale,
              true
            ),
          })}
        </p>
      )}
      {embedded && (
        <p className="guest-rebook-form__intro guest-rebook-form__intro--embedded text-xs text-zinc-500">
          {t("roomsHint")}
        </p>
      )}

      <section className="guest-rebook-form__section space-y-3">
        <h2 className="guest-rebook-form__heading">{t("guestSection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            {t("lastName")}
            <AdminInput
              name="guest_last_name"
              required
              value={guestLastName}
              onChange={(e) => setGuestLastName(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            {t("firstName")}
            <AdminInput
              name="guest_first_name"
              value={guestFirstName}
              onChange={(e) => setGuestFirstName(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            {t("email")}
            <AdminInput
              name="guest_email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            {t("phone")}
            <AdminInput
              name="guest_phone"
              type="tel"
              required
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
      </section>

      <section className="guest-rebook-form__section space-y-3">
        <h2 className="guest-rebook-form__heading">{t("staySection")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            {t("checkIn")}
            <AdminInput
              name="check_in"
              type="date"
              required
              min={today}
              value={checkIn}
              onChange={(e) => onCheckInChange(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            {t("checkOut")}
            <AdminInput
              name="check_out"
              type="date"
              required
              min={checkIn ? addDays(checkIn, 1) : today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
        <PartyFields value={party} onChange={setParty} appearance="reception" />
        <PartyHiddenInputs party={party} />
        <p className="text-xs text-zinc-500">
          {tConfirm("checkTimes", { checkIn: checkInTime, checkOut: checkOutTime })}
        </p>
        {invalidInterval && (
          <p className="text-sm text-red-700" role="alert">
            {tErrors("pickDates")}
          </p>
        )}
        {!invalidInterval && (
          <p className="text-sm font-medium text-zinc-700">
            {formatStayPeriod(checkIn, checkOut, locale, true)} · {nights}{" "}
            {nights === 1 ? tConfirm("night") : tConfirm("nights")}
          </p>
        )}
        <label className="block text-sm">
          {t("notes")}
          <AdminTextarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </label>
      </section>

      <section className="guest-rebook-form__section space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="guest-rebook-form__heading">{t("roomsSection")}</h2>
          {previewPending && (
            <span className="text-xs text-zinc-500">{tCommon("checking")}</span>
          )}
        </div>
        {!embedded && <p className="text-sm text-zinc-600">{t("roomsHint")}</p>}

        <p className="text-sm text-zinc-700">
          <strong>{guestCount}</strong> {tCommon("persons")}
          {canFulfill && minRoomsNeeded > 0 && (
            <span className="text-zinc-500">
              {" "}
              ·{" "}
              {tConfirm("minimumRoomsInPeriod", {
                count: minRoomsNeeded,
                rooms:
                  minRoomsNeeded === 1
                    ? tCommon("room")
                    : tCommon("rooms").toLowerCase(),
              })}
            </span>
          )}
        </p>

        {roomsError && (
          <p className="text-sm text-red-700" role="alert">
            {roomsError}
          </p>
        )}

        {showGlobalUnavailable && !previewPending && (
          <div
            role="alert"
            className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
          >
            {tConfirm("noAvailability")}
          </div>
        )}

        {canFulfill && availableRooms.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {availableRooms.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="room_ids"
                  value={r.id}
                  checked={selected.has(r.id)}
                  onChange={() => toggleRoom(r.id)}
                />
                <span className="min-w-0 flex-1">
                  {r.name} — {r.building_name} · {r.max_capacity}{" "}
                  {tCommon("personsShort")} ·{" "}
                  {formatCurrency(r.price_per_night, locale)} {tCommon("ronPerNight")}
                  <RoomFeatureBadges
                    roomTypeName={r.room_type_name}
                    optionSlugs={r.option_slugs}
                    hasAc={r.has_ac}
                    compact
                  />
                </span>
              </label>
            ))}
          </div>
        )}

        {showSelectionError && (
          <p className="text-sm text-red-800" role="alert">
            {tParty("selectionDoesNotFit", { guests: guestCount })}
          </p>
        )}

        {canFulfill && selected.size > 0 && nights > 0 && (
          <p className="text-sm font-medium text-zinc-800">
            {tConfirm("subtotal")}: {formatCurrency(standardTotal, locale)} RON
          </p>
        )}
      </section>

      <div className="guest-rebook-form__actions flex flex-wrap gap-3">
        <AdminButton
          variant="secondary"
          onClick={() => {
            if (onCancel) onCancel();
            else if (backHref) router.push(backHref);
          }}
        >
          {tCommon("cancel")}
        </AdminButton>
        <AdminButton
          type="submit"
          variant="primary"
          disabled={!canSubmit || previewPending}
        >
          {embedded ? t("confirm") : t("submit")}
        </AdminButton>
      </div>
    </AdminPendingForm>
  );
}
