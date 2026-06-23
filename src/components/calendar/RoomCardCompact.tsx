"use client";

import { useMemo } from "react";
import type { GuestStayOption } from "@/domain/availability/guest-stay-options";
import { getSelectableRooms, suggestRoomCount } from "@/domain/booking/room-selection-guard";
import type { RoomSelectionState } from "@/domain/booking/room-selection-guard";

type Props = {
  option: GuestStayOption;
  isSelected: boolean;
  onSelect: () => void;
  selectionState?: RoomSelectionState;
  locale: string;
};

function formatMoney(locale: string, n: number): string {
  const tag = locale === "bg" ? "bg-BG" : locale === "en" ? "en-GB" : "ro-RO";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * COMPACT Room Card - 50% smaller
 * Grid-friendly: 2 columns on tablet, 3-4 on desktop
 * Shows only essential info
 */
export function RoomCardCompact({
  option,
  isSelected,
  onSelect,
  selectionState,
  locale,
}: Props) {
  const selectableRooms = useMemo(() => {
    if (!selectionState) return null;
    return getSelectableRooms(selectionState);
  }, [selectionState]);

  const hint = useMemo(() => {
    if (!selectionState) return null;
    return suggestRoomCount(
      selectionState.selectedRoomIds.length,
      selectionState.requiredRoomCount
    );
  }, [selectionState]);

  const canSelect = useMemo(() => {
    if (!selectableRooms) return true;
    return selectableRooms.some((r) => r.selectable);
  }, [selectableRooms]);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!canSelect && !isSelected}
      className={[
        "room-card-compact",
        isSelected && "room-card-compact--selected",
        !canSelect && !isSelected && "room-card-compact--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      title={!canSelect && !isSelected ? "Need to select fewer rooms" : undefined}
    >
      {/* Header: Room # + Price */}
      <div className="room-card-compact__header">
        <span className="room-card-compact__number">{option.room_count}</span>
        <span className="room-card-compact__price">
          {formatMoney(locale, option.total_estimate_ron)}
        </span>
      </div>

      {/* Title (compact) */}
      <p className="room-card-compact__title">{option.title}</p>

      {/* Room list (minimal) */}
      <ul className="room-card-compact__rooms">
        {option.rooms.slice(0, 2).map((r) => (
          <li key={r.id} className="room-card-compact__room-item">
            {r.name}
            {option.rooms.length > 2 && option.rooms.indexOf(r) === 1 && (
              <span className="room-card-compact__more">
                +{option.rooms.length - 2}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Selection indicator */}
      <div className="room-card-compact__indicator">
        {isSelected ? <span>✓</span> : <span>○</span>}
      </div>

      {/* Disabled state hint */}
      {!canSelect && !isSelected && (
        <div className="room-card-compact__disabled-hint">
          {hint}
        </div>
      )}
    </button>
  );
}

/* ============ STYLES ============ */
const styles = `
.room-card-compact {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 6px 8px;
  padding: 8px 10px;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
}

.room-card-compact:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #f0f9ff;
  transform: translateY(-1px);
}

.room-card-compact--selected {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.room-card-compact--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f3f4f6;
}

.room-card-compact--disabled:hover {
  border-color: #e5e7eb;
  transform: none;
}

/* Header: Room number + Price */
.room-card-compact__header {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}

.room-card-compact__number {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.room-card-compact__price {
  font-size: 13px;
  font-weight: 600;
  color: #059669;
}

/* Title */
.room-card-compact__title {
  grid-column: 1 / 3;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  line-height: 1.3;
}

/* Room list */
.room-card-compact__rooms {
  grid-column: 1 / 3;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
}

.room-card-compact__room-item {
  font-size: 10px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.room-card-compact__more {
  font-size: 9px;
  color: #9ca3af;
  font-weight: 600;
}

/* Selection indicator */
.room-card-compact__indicator {
  grid-row: 1 / 4;
  grid-column: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #d1d5db;
  transition: color 0.2s;
}

.room-card-compact--selected .room-card-compact__indicator {
  color: #2563eb;
}

/* Disabled hint */
.room-card-compact__disabled-hint {
  grid-column: 1 / -1;
  font-size: 9px;
  color: #dc2626;
  font-weight: 500;
  padding-top: 2px;
  border-top: 1px solid #fee2e2;
}

/* RESPONSIVE */
@media (max-width: 640px) {
  .room-card-compact {
    padding: 6px 8px;
    gap: 4px 6px;
  }

  .room-card-compact__number {
    font-size: 14px;
  }

  .room-card-compact__price {
    font-size: 11px;
  }

  .room-card-compact__title {
    font-size: 11px;
  }

  .room-card-compact__indicator {
    font-size: 16px;
  }
}
`;

// Export styles as comment (use in your CSS file)
export const compactCardStyles = styles;
