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

      <p className="bd-confirm__hint">
        {tConfirm("checkTimes", { checkIn: checkInTime, checkOut: checkOutTime })}
      </p>

      <p className="bd-confirm__summary">
        <strong>{guestCount}</strong> {tCommon("persons")}
        {canFulfill && minRoomsNeeded > 0 && (
          <span className="bd-confirm__summary-sub">
            {" "}· {tConfirm("minimumRoomsInPeriod", {
              count: minRoomsNeeded,
              rooms: minRoomsNeeded === 1 ? tCommon("room") : tCommon("rooms").toLowerCase(),
            })}
          </span>
        )}
      </p>

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

      {canFulfill && availableRooms.length > 0 && (
        <div className="bd-confirm__rooms">
          <p className="bd-confirm__rooms-label">
            {tConfirm("availableRooms", { count: availableRooms.length })}
          </p>
          {availableRooms.map((r) => (
            <label
              key={r.id}
              className={`bd-confirm__room-option ${selected.has(r.id) ? "bd-confirm__room-option--selected" : ""}`}
            >
              <input
                type="checkbox"
                name="room_ids"
                value={r.id}
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="bd-confirm__room-check"
              />
              <span className="bd-confirm__room-info">
                <span className="bd-confirm__room-name">{r.name}</span>
                <span className="bd-confirm__room-meta">
                  {r.building_name} · {r.max_capacity} {tCommon("personsShort")} · {formatCurrency(r.price_per_night, "ro-RO")} {tCommon("ronPerNight")}
                </span>
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

      {canFulfill && selected.size > 0 && nights > 0 && (
        <div className="bd-confirm__price-box">
          <p className="bd-confirm__price-title">{tConfirm("standardPriceRooms")}</p>
          <ul className="bd-confirm__price-list">
            {selectedRooms.map((r) => (
              <li key={r.id}>
                {r.name}: {formatCurrency(r.price_per_night, "ro-RO")} RON × {nights}{" "}
                {nights === 1 ? tConfirm("night") : tConfirm("nights")} ={" "}
                <strong>{formatCurrency(r.price_per_night * nights, "ro-RO")} RON</strong>
              </li>
            ))}
          </ul>
          <p className="bd-confirm__price-total">
            {tConfirm("subtotal")}: <strong>{formatCurrency(standardTotal, "ro-RO")} RON</strong>
          </p>
          {!modifyPrice && (
            <p className="bd-confirm__price-note">
              {tConfirm("standardTotalRecorded", { total: formatCurrency(standardTotal, "ro-RO") })}
            </p>
          )}
        </div>
      )}

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
