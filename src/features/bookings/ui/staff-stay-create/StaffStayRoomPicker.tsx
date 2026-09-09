"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ConfirmRoomOption } from "@/services/booking-confirm";
import {
  staffStaySelectionKey,
  type StaffStayQuote,
  type StaffStaySuggestion,
} from "@/domain/availability/staff-stay-quote";

const CUSTOM_FILTER_THRESHOLD = 8;

function formatCurrency(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function groupRoomsByBuilding(rooms: ConfirmRoomOption[]): {
  building: string;
  rooms: ConfirmRoomOption[];
}[] {
  const map = new Map<string, ConfirmRoomOption[]>();
  for (const room of rooms) {
    const list = map.get(room.building_name);
    if (list) list.push(room);
    else map.set(room.building_name, [room]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([building, group]) => ({
      building,
      rooms: [...group].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function StaffStayRoomPicker({
  rooms,
  quote,
  suggestions,
  pending,
  previewError,
  onToggle,
  onApply,
  appearance,
  preferredRoomIds = [],
}: {
  rooms: ConfirmRoomOption[];
  quote: StaffStayQuote;
  suggestions: StaffStaySuggestion[];
  pending: boolean;
  previewError: string | null;
  onToggle: (roomId: string) => void;
  onApply: (roomIds: string[]) => void;
  appearance: "admin" | "reception";
  preferredRoomIds?: string[];
}) {
  const t = useTranslations("admin.gantt.quick");
  const tConfirm = useTranslations("admin.confirmRooms");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const selected = new Set(quote.selected.map((room) => room.id));
  const selectedKey = staffStaySelectionKey(quote.selected.map((room) => room.id));
  const reception = appearance === "reception";
  const preferredOk = suggestions.some((row) => row.kind === "preferred");
  const [userWantsCustom, setUserWantsCustom] = useState<boolean | null>(null);
  const [filter, setFilter] = useState("");
  const defaultCustomOpen = preferredRoomIds.length > 0 && !preferredOk;
  const customOpen = userWantsCustom ?? defaultCustomOpen;
  const showFilter = rooms.length > CUSTOM_FILTER_THRESHOLD;

  const filteredRooms = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(q) ||
        room.building_name.toLowerCase().includes(q),
    );
  }, [rooms, filter]);

  const grouped = useMemo(() => groupRoomsByBuilding(filteredRooms), [filteredRooms]);

  function applySuggestion(row: StaffStaySuggestion) {
    onApply(row.roomIds);
    setUserWantsCustom(false);
  }

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
          <span>{t("minRoomsHint", { count: quote.minRoomsNeeded })}</span>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <div className="staff-stay-suggestions">
          <p className="staff-stay-rooms__label">{t("suggestionsLabel")}</p>
          {suggestions.map((row) => {
            const on = row.id === selectedKey;
            const names = row.rooms.map((room) => room.name).join(" + ");
            const kindLabel =
              row.kind === "preferred"
                ? t("suggestionCalendar")
                : row.kind === "cheapest_single"
                  ? t("suggestionCheapest")
                  : t("suggestionCombo");
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => applySuggestion(row)}
                className={["staff-stay-suggestion", on && "staff-stay-suggestion--on"].filter(Boolean).join(" ")}
                aria-pressed={on}
              >
                <span className="staff-stay-suggestion__kind">{kindLabel}</span>
                <span className="staff-stay-suggestion__rooms">{names}</span>
                <span className="staff-stay-suggestion__price">
                  {formatCurrency(row.estimateRon, locale)} RON
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        className="staff-stay-rooms__toggle"
        onClick={() => setUserWantsCustom((prev) => !(prev ?? defaultCustomOpen))}
        aria-expanded={customOpen}
      >
        {customOpen ? t("hideRooms") : t("pickRooms")}
      </button>

      {customOpen ? (
        <div className="staff-stay-rooms__custom">
          {quote.selected.length > 0 ? (
            <div className="staff-stay-rooms__chips" aria-label={t("selectedRooms")}>
              {quote.selected.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="staff-stay-rooms__chip"
                  onClick={() => onToggle(room.id)}
                  aria-label={`${room.name}`}
                >
                  {room.name}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}
          {showFilter ? (
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("filterRooms")}
              className="staff-stay-rooms__filter"
            />
          ) : null}
          <div className="staff-stay-rooms__list">
            {grouped.map((group) => (
              <div key={group.building || "building"} className="staff-stay-rooms__group">
                {group.building ? (
                  <p className="staff-stay-rooms__group-label">{group.building}</p>
                ) : null}
                {group.rooms.map((room) => {
                  const on = selected.has(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => onToggle(room.id)}
                      className={["staff-stay-rooms__row", on && "staff-stay-rooms__row--on"].filter(Boolean).join(" ")}
                      aria-pressed={on}
                    >
                      <span className="staff-stay-rooms__row-name">{room.name}</span>
                      {room.building_name ? (
                        <>
                          <span className="staff-stay-rooms__sep" aria-hidden="true">
                            ·
                          </span>
                          <span>{room.building_name}</span>
                        </>
                      ) : null}
                      <span className="staff-stay-rooms__sep" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {room.max_capacity} {tCommon("personsShort")}
                      </span>
                      <span className="staff-stay-rooms__sep" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        {formatCurrency(room.price_per_night, locale)} RON
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
