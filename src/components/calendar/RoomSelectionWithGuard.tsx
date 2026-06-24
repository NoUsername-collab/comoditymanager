"use client";

import { useState, useMemo, useCallback } from "react";
import { useLocale } from "next-intl";
import type { GuestStayPreview } from "@/domain/availability/guest-stay-options";
import "./room-card-compact.css";
import {
  canSelectRoom,
  validateRoomSelection,
  suggestRoomCount,
  type RoomSelectionState,
} from "@/domain/booking/room-selection-guard";
import { RoomCardCompact } from "./RoomCardCompact";

type Props = {
  preview: GuestStayPreview;
  onComplete: (selectedOptionIds: string[]) => void;
  onCancel: () => void;
};

/**
 * Room Selection with Guard Rails
 *
 * - Uses decoupled validation (room-selection-guard.ts)
 * - Shows compact cards (RoomCardCompact.tsx)
 * - Prevents selecting more rooms than required
 * - Shows helpful hints
 * - NO spaghetti code
 */
export function RoomSelectionWithGuard({
  preview,
  onComplete,
  onCancel,
}: Props) {
  const locale = useLocale();
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Build selection state for guard
  const selectionState = useMemo((): RoomSelectionState => {
    const availableRooms = preview.options.flatMap((opt) =>
      opt.rooms.map((r) => ({ id: r.id, name: r.name }))
    );

    // Infer required room count from first option (all options should have same count)
    const requiredRoomCount = preview.options[0]?.rooms.length ?? 1;

    return {
      requiredRoomCount,
      selectedRoomIds,
      availableRooms,
    };
  }, [selectedRoomIds, preview]);

  // Handle room toggle with guard
  const toggleRoom = useCallback(
    (roomId: string) => {
      const isCurrentlySelected = selectedRoomIds.includes(roomId);
      const result = canSelectRoom(selectionState, roomId, isCurrentlySelected);

      if (result.allowed) {
        setSelectedRoomIds(result.selectedIds);
      } else {
        // Show warning (you'd integrate toast/alert here)
        console.warn("❌ Cannot select:", result.reason);
      }
    },
    [selectedRoomIds, selectionState]
  );

  // Validate before submit
  const handleSubmit = useCallback(() => {
    const validation = validateRoomSelection(selectionState);

    if (!validation.valid) {
      console.error("Validation failed:", validation.error);
      return;
    }

    // Find selected options
    const selectedOptionIds = preview.options
      .filter((opt) =>
        opt.rooms.every((r) => selectedRoomIds.includes(r.id))
      )
      .map((opt) => opt.option_id);

    onComplete(selectedOptionIds);
  }, [selectionState, preview, selectedRoomIds, onComplete]);

  const selectionHint = useMemo(() => {
    return suggestRoomCount(selectedRoomIds.length, selectionState.requiredRoomCount);
  }, [selectedRoomIds.length, selectionState.requiredRoomCount]);

  const isValid = useMemo(() => {
    return validateRoomSelection(selectionState).valid;
  }, [selectionState]);

  return (
    <div className="room-selection-guard">
      {/* Progress indicator */}
      <div className="room-selection-guard__progress">
        <h3 className="room-selection-guard__title">
          Confirm & Allocate Rooms
        </h3>
        <p className="room-selection-guard__subtitle">
          {selectionHint} ({selectedRoomIds.length}/{selectionState.requiredRoomCount})
        </p>
      </div>

      {/* Room grid - COMPACT */}
      <div className="room-selection-guard__grid">
        {preview.options.map((option) => (
          <RoomCardCompact
            key={option.option_id}
            option={option}
            isSelected={option.rooms.every((r) =>
              selectedRoomIds.includes(r.id)
            )}
            onSelect={() => {
              // Toggle all rooms in this option
              const roomIds = option.rooms.map((r) => r.id);
              const allSelected = roomIds.every((id) =>
                selectedRoomIds.includes(id)
              );

              if (allSelected) {
                setSelectedRoomIds(
                  selectedRoomIds.filter((id) => !roomIds.includes(id))
                );
              } else {
                // Try to add - guard will prevent if over limit
                for (const roomId of roomIds) {
                  if (!selectedRoomIds.includes(roomId)) {
                    toggleRoom(roomId);
                  }
                }
              }
            }}
            selectionState={selectionState}
            locale={locale}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="room-selection-guard__actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid}
          className="btn btn-primary"
          title={!isValid ? "Need to select correct number of rooms" : undefined}
        >
          Confirm Selection
        </button>
      </div>

      {/* Error state */}
      {!isValid && (
        <div className="room-selection-guard__error">
          <strong>⚠️ {validateRoomSelection(selectionState).error}</strong>
        </div>
      )}
    </div>
  );
}

/* ============ STYLES ============ */
export const styles = `
.room-selection-guard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.room-selection-guard__progress {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.room-selection-guard__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.room-selection-guard__subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

/* Grid - Compact layout */
.room-selection-guard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

@media (max-width: 640px) {
  .room-selection-guard__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

/* Actions */
.room-selection-guard__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

/* Error message */
.room-selection-guard__error {
  padding: 10px 12px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 12px;
  color: #dc2626;
}
`;
