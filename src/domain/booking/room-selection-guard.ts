/**
 * Room Selection Guard - Decoupled validation logic
 * Prevents selecting more rooms than required
 * NO UI concerns, NO side effects
 */

export type RoomSelectionState = {
  requiredRoomCount: number;
  selectedRoomIds: string[];
  availableRooms: Array<{ id: string; name: string }>;
};

export type RoomSelectionResult = {
  allowed: boolean;
  reason?: string;
  selectedIds: string[];
};

/**
 * Guard: Can user select another room?
 * Returns validation result + safe selected IDs
 */
export function canSelectRoom(
  state: RoomSelectionState,
  roomIdToToggle: string,
  isCurrentlySelected: boolean
): RoomSelectionResult {
  const { requiredRoomCount, selectedRoomIds } = state;

  // Case 1: Deselecting a room - always allowed
  if (isCurrentlySelected) {
    return {
      allowed: true,
      selectedIds: selectedRoomIds.filter((id) => id !== roomIdToToggle),
    };
  }

  // Case 2: Selecting a room when we already have enough - BLOCKED
  if (selectedRoomIds.length >= requiredRoomCount) {
    return {
      allowed: false,
      reason: `Already selected ${selectedRoomIds.length} room(s). Need ${requiredRoomCount} total.`,
      selectedIds: selectedRoomIds,
    };
  }

  // Case 3: Can add more rooms
  return {
    allowed: true,
    selectedIds: [...selectedRoomIds, roomIdToToggle],
  };
}

/**
 * Guard: Validate final selection before submit
 */
export function validateRoomSelection(
  state: RoomSelectionState
): { valid: boolean; error?: string } {
  const { requiredRoomCount, selectedRoomIds } = state;

  if (selectedRoomIds.length < requiredRoomCount) {
    return {
      valid: false,
      error: `Need ${requiredRoomCount} room(s), only selected ${selectedRoomIds.length}`,
    };
  }

  if (selectedRoomIds.length > requiredRoomCount) {
    return {
      valid: false,
      error: `Selected too many rooms (${selectedRoomIds.length} > ${requiredRoomCount})`,
    };
  }

  return { valid: true };
}

/**
 * Guard: Get available rooms for selection
 * Respects the "can select X more rooms" constraint
 */
export function getSelectableRooms(
  state: RoomSelectionState
): Array<{ id: string; name: string; selectable: boolean; reason?: string }> {
  const { requiredRoomCount, selectedRoomIds, availableRooms } = state;
  const spotsRemaining = requiredRoomCount - selectedRoomIds.length;

  return availableRooms.map((room) => {
    const isSelected = selectedRoomIds.includes(room.id);

    // Already selected = can deselect
    if (isSelected) {
      return { ...room, selectable: true };
    }

    // Can only select if we have spots remaining
    if (spotsRemaining > 0) {
      return { ...room, selectable: true };
    }

    // No spots left
    return {
      ...room,
      selectable: false,
      reason: `Need ${requiredRoomCount} rooms (${selectedRoomIds.length} selected)`,
    };
  });
}

/**
 * Guard: Suggest rooms (helps user select correct count)
 */
export function suggestRoomCount(
  selectedCount: number,
  requiredCount: number
): string {
  if (selectedCount === requiredCount) return "✓ All rooms selected";
  if (selectedCount < requiredCount) {
    return `Select ${requiredCount - selectedCount} more room(s)`;
  }
  return `Remove ${selectedCount - requiredCount} room(s)`;
}
