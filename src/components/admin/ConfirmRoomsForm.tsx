"use client";

import { useMemo, useState } from "react";
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

function formatRon(value: number): string {
  return value.toLocaleString("ro-RO", {
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
  submitLabel = "Confirmă rezervarea",
  action,
}: Props) {
  const validDefaults = defaultSelectedIds.filter((id) =>
    availableRooms.some((r) => r.id === id)
  );

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
        Check-in {checkInTime} · Check-out {checkOutTime}
      </p>

      <p className="text-sm text-zinc-700">
        <strong>{guestCount}</strong> persoane
        {canFulfill && minRoomsNeeded > 0 && (
          <span className="text-zinc-500">
            {" "}
            · minim <strong>{minRoomsNeeded}</strong>{" "}
            {minRoomsNeeded === 1 ? "cameră" : "camere"} în perioada aleasă
          </span>
        )}
      </p>

      {showGlobalUnavailable && (
        <div
          role="alert"
          className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
        >
          Nu există disponibilitate
          <p className="mt-1 font-normal text-red-800">
            {noRoomsAvailable
              ? "Nicio cameră liberă în intervalul cererii."
              : `Capacitatea camerelor libere (${availableRooms.length} ${
                  availableRooms.length === 1 ? "cameră" : "camere"
                }) nu acoperă ${guestCount} persoane.`}
          </p>
        </div>
      )}

      {canFulfill && availableRooms.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          <p className="text-xs font-medium text-zinc-600">
            Camere disponibile ({availableRooms.length})
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
                {r.name} — {r.building_name} · {r.max_capacity} pers. ·{" "}
                {formatRon(r.price_per_night)} RON/noapte
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
          Camerele selectate au capacitate {selectedCapacity} pers. — insuficient
          pentru {guestCount} persoane.
        </div>
      )}

      {canFulfill && selected.size === 0 && (
        <p className="text-sm text-amber-800">Selectează cel puțin o cameră.</p>
      )}

      {canFulfill && selected.size > 0 && nights > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
          <p className="font-medium text-zinc-800">Preț standard (camere)</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            {selectedRooms.map((r) => (
              <li key={r.id}>
                {r.name}: {formatRon(r.price_per_night)} RON × {nights}{" "}
                {nights === 1 ? "noapte" : "nopți"} ={" "}
                {formatRon(r.price_per_night * nights)} RON
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-zinc-200 pt-2 font-medium text-zinc-800">
            Subtotal: {formatRon(standardTotal)} RON
          </p>
          {!modifyPrice && (
            <p className="mt-1 text-xs text-zinc-500">
              La confirmare se înregistrează totalul standard ({formatRon(standardTotal)}{" "}
              RON) în statistici.
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
            Modifică prețul de bază
          </label>

          {modifyPrice && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
              <label className="block text-sm">
                Supliment (+ RON, pe lângă prețul standard)
                <input
                  name="price_adjustment"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </label>
              {!adjustmentValid && (
                <p className="text-xs text-red-700">Introdu o sumă validă.</p>
              )}
              <p className="text-sm font-medium text-zinc-800">
                Total înregistrat: {formatRon(finalTotal)} RON
                <span className="ml-1 font-normal text-zinc-600">
                  ({formatRon(standardTotal)} + {formatRon(adjustmentNum)})
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
        {submitLabel}
      </button>
    </AdminPendingForm>
  );
}
