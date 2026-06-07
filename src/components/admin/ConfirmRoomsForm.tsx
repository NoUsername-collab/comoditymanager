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
  returnTo?: string;
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
  returnTo,
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
    <AdminPendingForm action={action} className="bd-confirm">
      <input type="hidden" name="id" value={bookingId} />
      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}

      {/* Header: guest count + check times */}
      <div className="bd-confirm__header">
        <span className="bd-confirm__guest-count">
          {guestCount} {tCommon("persons")}
        </span>
        {canFulfill && minRoomsNeeded > 0 && (
          <span className="bd-confirm__min-rooms">
            min. {minRoomsNeeded} {minRoomsNeeded === 1 ? tCommon("room") : tCommon("rooms").toLowerCase()}
          </span>
        )}
        <span className="bd-confirm__times">
          {tConfirm("checkTimes", { checkIn: checkInTime, checkOut: checkOutTime })}
        </span>
      </div>

      {/* Unavailable alert */}
      {showGlobalUnavailable && (
        <div role="alert" className="bd-confirm__alert bd-confirm__alert--danger">
          {tConfirm("noAvailability")}
          <p className="bd-confirm__alert-detail">
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

      {/* ── Room selection progress slider ────────────────────── */}
      {canFulfill && minRoomsNeeded > 0 && (
        <div className="bd-room-progress">
          <div className="bd-room-progress__track">
            <div
              className={`bd-room-progress__fill ${selected.size >= minRoomsNeeded ? "bd-room-progress__fill--done" : ""}`}
              style={{ width: `${Math.min((selected.size / minRoomsNeeded) * 100, 100)}%` }}
            />
            {/* Notch marks for each room needed */}
            {Array.from({ length: minRoomsNeeded }, (_, i) => (
              <span
                key={i}
                className={`bd-room-progress__notch ${i < selected.size ? "bd-room-progress__notch--filled" : ""}`}
                style={{ left: `${((i + 1) / minRoomsNeeded) * 100}%` }}
              />
            ))}
          </div>
          <span className={`bd-room-progress__label ${selected.size >= minRoomsNeeded ? "bd-room-progress__label--done" : ""}`}>
            {selected.size >= minRoomsNeeded
              ? tConfirm("roomGoalReached")
              : tConfirm("roomProgress", { current: selected.size, needed: minRoomsNeeded })}
          </span>
        </div>
      )}

      {/* ── Room tiles grid ──────────────────────────────────── */}
      {canFulfill && availableRooms.length > 0 && (
        <>
          <p className="bd-confirm__rooms-label">
            {tConfirm("availableRooms", { count: availableRooms.length })}
          </p>
          <div className="bd-room-grid">
            {availableRooms.map((r) => {
              const isSelected = selected.has(r.id);
              return (
                <label
                  key={r.id}
                  className={`bd-room-tile ${isSelected ? "bd-room-tile--on" : ""}`}
                >
                  <input
                    type="checkbox"
                    name="room_ids"
                    value={r.id}
                    checked={isSelected}
                    onChange={() => toggle(r.id)}
                    className="bd-room-tile__input"
                  />

                  {/* Checkmark badge */}
                  <span className="bd-room-tile__check" aria-hidden>
                    {isSelected ? "✓" : ""}
                  </span>

                  {/* Room name + building */}
                  <span className="bd-room-tile__name">{r.name}</span>
                  <span className="bd-room-tile__building">{r.building_name}</span>

                  {/* Capacity + price row */}
                  <span className="bd-room-tile__details">
                    <span className="bd-room-tile__capacity">
                      {r.max_capacity} {tCommon("personsShort")}
                    </span>
                    <span className="bd-room-tile__price">
                      {formatCurrency(r.price_per_night, "ro-RO")} RON
                    </span>
                  </span>

                  {/* Features */}
                  <span className="bd-room-tile__features">
                    <RoomFeatureBadges
                      roomTypeName={r.room_type_name}
                      optionSlugs={r.option_slugs}
                      hasAc={r.has_ac}
                      compact
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {/* Capacity error */}
      {showSelectionError && (
        <div role="alert" className="bd-confirm__alert bd-confirm__alert--warn">
          {tConfirm("selectedCapacityInsufficient", {
            capacity: selectedCapacity,
            guests: guestCount,
            personsShort: tCommon("personsShort"),
          })}
        </div>
      )}

      {canFulfill && selected.size === 0 && (
        <p className="bd-confirm__nudge">{tConfirm("selectAtLeastOneRoom")}</p>
      )}

      {/* ── Price summary ────────────────────────────────────── */}
      {canFulfill && selected.size > 0 && nights > 0 && (
        <div className="bd-confirm__price-box">
          <div className="bd-confirm__price-rows">
            {selectedRooms.map((r) => (
              <div key={r.id} className="bd-confirm__price-row">
                <span>{r.name}</span>
                <span className="bd-confirm__price-calc">
                  {formatCurrency(r.price_per_night, "ro-RO")} × {nights} =
                </span>
                <strong>{formatCurrency(r.price_per_night * nights, "ro-RO")} RON</strong>
              </div>
            ))}
          </div>
          <div className="bd-confirm__price-total">
            <span>{tConfirm("subtotal")}</span>
            <strong>{formatCurrency(standardTotal, "ro-RO")} RON</strong>
          </div>
        </div>
      )}

      {/* ── Price adjustment ─────────────────────────────────── */}
      {canFulfill && selected.size > 0 && (
        <div className="bd-confirm__adjust">
          <label className="bd-confirm__adjust-toggle">
            <input
              type="checkbox"
              name="modify_price"
              checked={modifyPrice}
              onChange={(e) => setModifyPrice(e.target.checked)}
            />
            {tConfirm("modifyBasePrice")}
          </label>

          {modifyPrice && (
            <div className="bd-confirm__adjust-panel">
              <label className="bd-confirm__adjust-field">
                {tConfirm("supplementLabel")}
                <input
                  name="price_adjustment"
                  type="number"
                  step="0.01"
                  placeholder={tConfirm("zero")}
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  className="bd-confirm__adjust-input"
                />
              </label>
              {!adjustmentValid && (
                <p className="bd-confirm__adjust-error">{tConfirm("enterValidAmount")}</p>
              )}
              <p className="bd-confirm__adjust-result">
                {tConfirm("recordedTotal")}: <strong>{formatCurrency(finalTotal, "ro-RO")} RON</strong>
                <span className="bd-confirm__adjust-breakdown">
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
        className="bd-confirm__submit"
      >
        {resolvedSubmitLabel}
      </button>
    </AdminPendingForm>
  );
}
