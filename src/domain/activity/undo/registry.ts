import type { ActivityAction, ActivityLogEntry } from "@/domain/activity/types";

/** Actions with a registered undo handler in activity-undo service. */
export const UNDOABLE_ACTIONS = new Set<ActivityAction>([
  "booking.shifted",
  "booking.checkin.set",
  "booking.checkout.set",
  "booking.cancelled",
  "booking.confirmed",
  "occupancy.hold_created",
  "occupancy.block_created",
  "building.price_updated",
]);

/** Max age for undo (72h). */
export const UNDO_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export function isUndoableAction(action: ActivityAction): boolean {
  return UNDOABLE_ACTIONS.has(action);
}

export function canUndoActivityEntry(entry: ActivityLogEntry): boolean {
  if (!entry.undoable || entry.undone_at) return false;
  if (!isUndoableAction(entry.action)) return false;
  if (entry.action === "activity.undone") return false;
  const age = Date.now() - new Date(entry.created_at).getTime();
  if (age > UNDO_MAX_AGE_MS) return false;
  return true;
}

export function isUndoneEntry(entry: ActivityLogEntry): boolean {
  return Boolean(entry.undone_at);
}
