"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ConfirmRoomOption } from "@/services/booking-confirm";
import type { StaffStayQuote } from "@/domain/availability/staff-stay-quote";
import { RoomFeatureBadges } from "@/features/rooms/ui/RoomFeatureBadges";

function formatCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function StaffStayRoomPicker({
  rooms,
  quote,
  pending,
  previewError,
  onToggle,
  appearance,
}: {
  rooms: ConfirmRoomOption[];
  quote: StaffStayQuote;
  pending: boolean;
  previewError: string | null;
  onToggle: (roomId: string) => void;
  appearance: "admin" | "reception";
}) {
  const t = useTranslations("admin.gantt.quick");
  const tConfirm = useTranslations("admin.confirmRooms");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const selected = new Set(quote.selected.map((room) => room.id));
  const reception = appearance === "reception";

  if (previewError) {
    return (
      <p className={reception ? "text-sm text-red-300" : "admin-banner admin-banner--danger"} role="alert">
        {previewError}
      </p>
    );
  }

  if (pending && rooms.length === 0) {
    return <p className={reception ? "text-xs text-zinc-400" : "text-sm text-zinc-500"}>{t("roomsLoading")}</p>;
  }

  if (!quote.canFulfill || rooms.length === 0) {
    return (
      <div
        role="alert"
        className={
          reception
            ? "rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-200"
            : "admin-banner admin-banner--danger"
        }
      >
        {tConfirm("noAvailability")}
        <p className="mt-1 text-sm font-normal">
          {rooms.length === 0
            ? tConfirm("noRoomInRequestedRange")
            : tConfirm("capacityDoesNotCoverGuests", {
                count: rooms.length,
                rooms:
                  rooms.length === 1
                    ? tCommon("room")
                    : tCommon("rooms").toLowerCase(),
                guests: quote.guestCount,
              })}
        </p>
      </div>
    );
  }

  return (
    <div className={["staff-stay-rooms", reception && "staff-stay-rooms--reception"].filter(Boolean).join(" ")}>
      <div className="staff-stay-rooms__meta">
        <span>
          {quote.guestCount} {tCommon("persons")}
        </span>
        {quote.minRoomsNeeded > 0 ? (
          <span>
            {t("minRoomsHint", { count: quote.minRoomsNeeded })}
          </span>
        ) : null}
      </div>
      <p className="staff-stay-rooms__label">
        {tConfirm("availableRooms", { count: rooms.length })}
      </p>
      <div className="staff-stay-rooms__grid">
        {rooms.map((room) => {
          const on = selected.has(room.id);
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onToggle(room.id)}
              className={["staff-stay-room", on && "staff-stay-room--on"].filter(Boolean).join(" ")}
              aria-pressed={on}
            >
              <span className="staff-stay-room__name">{room.name}</span>
              <span className="staff-stay-room__building">{room.building_name}</span>
              <span className="staff-stay-room__details">
                <span>
                  {room.max_capacity} {tCommon("personsShort")}
                </span>
                <span>
                  {formatCurrency(room.price_per_night, locale)} RON
                </span>
              </span>
              <span className="staff-stay-room__features">
                <RoomFeatureBadges
                  roomTypeName={room.room_type_name}
                  optionSlugs={room.option_slugs}
                  hasAc={room.has_ac}
                  compact
                />
              </span>
            </button>
          );
        })}
      </div>
      {quote.selected.length > 0 && !quote.hostsGuests ? (
        <p className={reception ? "text-sm text-amber-200" : "admin-banner admin-banner--warning"} role="alert">
          {tConfirm("selectedCapacityInsufficient", {
            capacity: quote.selectedCapacity,
            guests: quote.guestCount,
            personsShort: tCommon("personsShort"),
          })}
        </p>
      ) : null}
      {quote.selected.length === 0 ? (
        <p className="staff-stay-rooms__nudge">{tConfirm("selectAtLeastOneRoom")}</p>
      ) : null}
      {quote.hostsGuests && quote.estimateRon > 0 ? (
        <div className="staff-stay-quote">
          {quote.lines.map((line) => (
            <div key={line.roomId} className="staff-stay-quote__row">
              <span>{line.roomName}</span>
              <strong>{formatCurrency(line.lineTotal, locale)} RON</strong>
            </div>
          ))}
          <div className="staff-stay-quote__total">
            <span>{t("estimateLabel")}</span>
            <strong>{formatCurrency(quote.estimateRon, locale)} RON</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}
