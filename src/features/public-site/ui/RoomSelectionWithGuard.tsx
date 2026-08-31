"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GuestStayPreview } from "@/domain/availability/guest-stay-options";
import {
  canSelectRoom,
  validateRoomSelection,
  suggestRoomCount,
  type RoomSelectionState,
} from "@/domain/booking/room-selection-guard";

type Props = {
  preview: GuestStayPreview;
  onComplete: (roomIds: string[]) => void;
  onCancel: () => void;
};

export function RoomSelectionWithGuard({
  preview,
  onComplete,
  onCancel,
}: Props) {
  const t = useTranslations("public.form");
  const tErrors = useTranslations("errors");

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const requiredRoomCount = Math.ceil(
    preview.guest_count / 4
  );

  const guardState: RoomSelectionState = {
    requiredRoomCount,
    selectedRoomIds,
    availableRooms: preview.options.flatMap((opt) =>
      opt.rooms.map((r) => ({ id: r.id, name: r.name }))
    ),
  };

  const handleToggleRoom = (roomId: string) => {
    const isCurrentlySelected = selectedRoomIds.includes(roomId);
    const result = canSelectRoom(guardState, roomId, isCurrentlySelected);

    if (result.allowed) {
      setSelectedRoomIds(result.selectedIds);
      setValidationError(null);
    } else {
      setValidationError(result.reason || "Cannot select this room");
    }
  };

  const handleConfirm = () => {
    const validation = validateRoomSelection(guardState);

    if (!validation.valid) {
      setValidationError(validation.error || "Invalid room selection");
      return;
    }

    if (selectedRoomIds.length === 0) {
      setValidationError("Please select at least one room");
      return;
    }

    onComplete(selectedRoomIds);
  };

  const availableRooms = preview.options.flatMap((opt) =>
    opt.rooms.map((room) => ({
      ...room,
      option: opt,
      isSelected: selectedRoomIds.includes(room.id),
    }))
  );

  const hint = suggestRoomCount(selectedRoomIds.length, requiredRoomCount);
  const isValid = selectedRoomIds.length === requiredRoomCount;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-admin-text">
          {t("selectRooms", { count: requiredRoomCount }) || "Select rooms"}
        </h3>
        <p className="text-sm text-admin-text-muted">{hint}</p>
      </div>

      {validationError && (
        <div className="rounded-md bg-admin-tint-danger-bg p-3 text-sm text-admin-tint-danger-text border border-admin-tint-danger-border">
          {validationError}
        </div>
      )}

      <div className="grid auto-fill gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {availableRooms.map((room) => {
          const spotsRemaining = requiredRoomCount - selectedRoomIds.length;
          const canSelect = room.isSelected || spotsRemaining > 0;

          return (
            <button
              key={room.id}
              onClick={() => handleToggleRoom(room.id)}
              disabled={!canSelect}
              className={`
                relative flex flex-col gap-2 rounded-lg border-2 p-3
                transition-all
                ${
                  room.isSelected
                    ? "border-admin-accent bg-admin-tint-info-bg"
                    : "border-admin-panel-border bg-admin-panel-bg"
                }
                ${!canSelect ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-admin-accent"}
              `}
            >
              <div className="flex items-start justify-between">
                <span className="font-semibold text-admin-text">{room.name}</span>
                <span className="text-xs font-bold text-admin-accent">
                  {room.price_per_night} RON/night
                </span>
              </div>

              <div className="text-xs text-admin-text-muted">
                {room.building_name}
              </div>

              <div className="text-xs text-admin-text-muted">
                Max {room.capacity_max} guests
                {room.has_ac && " · AC"}
              </div>

              <div className="flex items-center justify-center pt-1">
                {room.isSelected ? (
                  <span className="text-lg">✓</span>
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-admin-text-muted" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 justify-between">
        <button
          onClick={onCancel}
          className="rounded-lg border border-admin-panel-border px-4 py-2 text-sm font-medium text-admin-text hover:bg-admin-panel-border transition-colors"
        >
          {t("cancel") || "Cancel"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className={`
            rounded-lg px-4 py-2 text-sm font-medium text-white transition-all
            ${
              isValid
                ? "bg-admin-accent hover:bg-admin-accent-hover cursor-pointer"
                : "cursor-not-allowed bg-admin-text-muted opacity-50"
            }
          `}
        >
          {t("confirm") || "Confirm"}
        </button>
      </div>
    </div>
  );
}
