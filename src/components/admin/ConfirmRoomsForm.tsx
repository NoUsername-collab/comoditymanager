"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { stayNightCount } from "@/lib/stay-dates";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import type { ConfirmRoomOption } from "@/services/booking-confirm";
import { RoomFeatureBadges } from "@/components/admin/catalog/RoomFeatureBadges";
import {
  canRoomsHostGuests,
  totalCapacityOfRooms,
} from "@/domain/availability/stay-capacity";

type Props = {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  minRoomsNeeded: number;
  canFulfill: boolean;
  availableRooms: ConfirmRoomOption[];
  checkInTime: string;
  checkOutTime: string;
  defaultSelectedIds?: string[];
  submitLabel?: string;
  action: (formData: FormData) => Promise<void>;
};

function formatCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ConfirmRoomsForm({
  bookingId,
  checkIn,
  checkOut,
  guestCount,
  minRoomsNeeded,
  canFulfill,
  availableRooms,
  checkInTime,
  checkOutTime,
  defaultSelectedIds = [],
  submitLabel,
  action,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tConfirm = useTranslations("admin.confirmRooms");
  const validDefaults = defaultSelectedIds.filter((id) =>
    availableRooms.some((r) => r.id === id)
  );
  const resolvedSubmitLabel = submitLabel ?? tConfirm("confirmBooking");

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(validDefaults)
  );
  const [modifyPrice, setModifyPrice] = useState(false);
  const [adjustment, setAdjustment] = useState("");

  const nights = stayNightCount(checkIn, checkOut);

  const selectedRooms = useMemo(
    () => availableRooms.filter((r) => selected.has(r.id)),
    [availableRooms, selected]
  );

  const standardTotal = useMemo(
    () =>
      selectedRooms.length > 0
        ? computeStandardStayTotal(selectedRooms, checkIn, checkOut)
        : 0,
    [selectedRooms, checkIn, checkOut]
  );

  const adjustmentNum = adjustment === "" ? 0 : Number(adjustment);
  const adjustmentValid =
    adjustment === "" || Number.isFinite(adjustmentNum);
  const finalTotal =
    modifyPrice && adjustmentValid
      ? Math.round((standardTotal + adjustmentNum) * 100) / 100
      : standardTotal;

  const selectedCapacity = totalCapacityOfRooms(selectedRooms);
  const selectionHostsGuests = canRoomsHostGuests(guestCount, selectedRooms);

  const noRoomsAvailable = availableRooms.length === 0;
  const showGlobalUnavailable = !canFulfill || noRoomsAvailable;
  const showSelectionError =
    canFulfill &&
    selected.size > 0 &&
    !selectionHostsGuests;

  const canSubmit =
    canFulfill &&
    selected.size > 0 &&
    selectionHostsGuests &&
    !noRoomsAvailable &&
    (!modifyPrice || adjustmentValid);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AdminPendingForm action={action} className="space-y-4">
      <input type="hidden" name="id" value={bookingId} />

      <p className="text-xs text-zinc-500">
        {tConfirm("checkTimes", { checkIn: checkInTime, checkOut: checkOutTime })}
      </p>

      <p className="text-sm text-zinc-700">
        <strong>{guestCount}</strong> {tCommon("persons")}
        {canFulfill && minRoomsNeeded > 0 && (
          <span className="text-zinc-500">
            {" "}
            · {tConfirm("minimumRoomsInPeriod", {
              count: minRoomsNeeded,
              rooms: minRoomsNeeded === 1 ? tCommon("room") : tCommon("rooms").toLowerCase(),
            })}
          </span>
        )}
      </p>

      {showGlobalUnavailable && (
        <div
          role="alert"
          className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          {tConfirm("noAvailability")}
          <p className="mt-1 font-normal text-red-800">
            {noRoomsAvailable
              ? tConfirm("noRoomInRequestedRange")
              : tConfirm("capacityDoesNotCoverGuests", {
                  count: availableRooms.length,
                  rooms: availableRooms.length === 1 ? tCommon("room") : tCommon("rooms").toLowerCase(),
                  guests: guestCount,
                })}
          </p>
        </div>
      )}

      {canFulfill && availableRooms.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          <p className="text-xs font-medium text-zinc-600">
            {tConfirm("availableRooms", { count: availableRooms.length })}
          </p>
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
                onChange={() => toggle(r.id)}
              />
              <span className="min-w-0 flex-1">
                {r.name} — {r.building_name} · {r.max_capacity} {tCommon("personsShort")} ·{" "}
                {formatCurrency(r.price_per_night, "ro-RO")} {tCommon("ronPerNight")}
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
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {tConfirm("selectedCapacityInsufficient", {
            capacity: selectedCapacity,
            guests: guestCount,
            personsShort: tCommon("personsShort"),
          })}
        </div>
      )}

      {canFulfill && selected.size === 0 && (
        <p className="text-sm text-amber-800">{tConfirm("selectAtLeastOneRoom")}</p>
      )}

      {canFulfill && selected.size > 0 && nights > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
          <p className="font-medium text-zinc-800">{tConfirm("standardPriceRooms")}</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            {selectedRooms.map((r) => (
              <li key={r.id}>
                {r.name}: {formatCurrency(r.price_per_night, "ro-RO")} RON × {nights}{" "}
                {nights === 1 ? tConfirm("night") : tConfirm("nights")} ={" "}
                {formatCurrency(r.price_per_night * nights, "ro-RO")} RON
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-zinc-200 pt-2 font-medium text-zinc-800">
            {tConfirm("subtotal")}: {formatCurrency(standardTotal, "ro-RO")} RON
          </p>
          {!modifyPrice && (
            <p className="mt-1 text-xs text-zinc-500">
              {tConfirm("standardTotalRecorded", { total: formatCurrency(standardTotal, "ro-RO") })}
            </p>
          )}
        </div>
      )}

      {canFulfill && selected.size > 0 && (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="modify_price"
              checked={modifyPrice}
              onChange={(e) => setModifyPrice(e.target.checked)}
            />
            {tConfirm("modifyBasePrice")}
          </label>

          {modifyPrice && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
              <label className="block text-sm">
                {tConfirm("supplementLabel")}
                <input
                  name="price_adjustment"
                  type="number"
                  step="0.01"
                  placeholder={tConfirm("zero")}
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </label>
              {!adjustmentValid && (
                <p className="text-xs text-red-700">{tConfirm("enterValidAmount")}</p>
              )}
              <p className="text-sm font-medium text-zinc-800">
                {tConfirm("recordedTotal")}: {formatCurrency(finalTotal, "ro-RO")} RON
                <span className="ml-1 font-normal text-zinc-600">
                  ({formatCurrency(standardTotal, "ro-RO")} + {formatCurrency(adjustmentNum, "ro-RO")})
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
      >
        {resolvedSubmitLabel}
      </button>
    </AdminPendingForm>
  );
}
