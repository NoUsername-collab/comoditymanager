/**
 * Option Selection Guard
 *
 * Pure domain logic for validating guest stay option selection.
 * NO UI, NO side effects. Decoupled from React/components.
 */

import type { GuestStayOption, GuestStayPreview } from "./guest-stay-options";

export type OptionSelectionResult = {
  valid: boolean;
  reason?: string;
};

/**
 * Guard: Can user select this option?
 * Validates that option capacity matches guest count.
 */
export function canSelectOption(
  option: GuestStayOption,
  guestCount: number
): OptionSelectionResult {
  // Get max capacity of option (max across all rooms)
  const maxCapacity = Math.max(
    ...option.rooms.map((r) => r.capacity_max),
    0
  );

  // Simple check: option must fit all guests
  if (maxCapacity < guestCount) {
    return {
      valid: false,
      reason: `This option cannot fit ${guestCount} guests (max capacity: ${maxCapacity})`,
    };
  }

  return { valid: true };
}

/**
 * Guard: Validate final selection before submission
 */
export function validateOptionSelection(
  selected: GuestStayOption | null,
  guestCount: number
): OptionSelectionResult {
  if (!selected) {
    return {
      valid: false,
      reason: "Please select an option",
    };
  }

  return canSelectOption(selected, guestCount);
}

/**
 * Helper: Get summary text for option
 */
export function getOptionSummary(option: GuestStayOption): string {
  const roomCount = option.rooms.length;
  const roomList = option.rooms
    .slice(0, 2)
    .map((r) => r.name)
    .join(", ");
  const more = roomCount > 2 ? ` +${roomCount - 2}` : "";
  return `${roomList}${more}`;
}
