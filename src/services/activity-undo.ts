import type { ActivityLogEntry } from "@/domain/activity/types";
import type { BookingStatus } from "@/domain/booking/types";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import {
  canUndoActivityEntry,
  isUndoableAction,
} from "@/domain/activity/undo/registry";
import {
  getActivityLogEntryById,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  rescheduleBookingDates,
  undoBookingCheckIn,
  undoBookingCheckOut,
} from "@/services/bookings";
import { updateBuildingDefaultPrice } from "@/services/buildings";
import { deleteRoomBlock } from "@/services/room-blocks";
import { releaseRoomHold } from "@/services/room-holds";

function metaString(m: Record<string, unknown>, key: string): string | null {
  const v = m[key];
  return v != null && v !== "" ? String(v) : null;
}

function metaStringArray(m: Record<string, unknown>, key: string): string[] {
  const v = m[key];
  if (!Array.isArray(v)) return [];
  return v.map(String).filter(Boolean);
}

async function markActivityUndone(logId: string, userId: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("admin_activity_log")
    .update({
      undone_at: new Date().toISOString(),
      undone_by: userId,
    })
    .eq("tenant_id", tenantId)
    .eq("id", logId)
    .is("undone_at", null);

  if (error) throw new Error(error.message);
}

async function undoBookingShifted(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");

  const fromIn = metaString(entry.metadata, "from_check_in");
  const fromOut = metaString(entry.metadata, "from_check_out");
  if (!fromIn || !fromOut) throw new Error("activity.undo_missing_metadata");

  await rescheduleBookingDates(bookingId, fromIn, fromOut);
}

async function undoBookingCheckInSet(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");
  await undoBookingCheckIn(bookingId);
}

async function undoBookingCheckOutSet(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");
  await undoBookingCheckOut(bookingId);
}

async function undoBookingCancelled(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");

  const previousStatus = metaString(entry.metadata, "previous_status") as
    | BookingStatus
    | null;
  if (!previousStatus || previousStatus === "anulata") {
    throw new Error("activity.undo_missing_metadata");
  }

  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("bookings")
    .update({ status: previousStatus })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .eq("status", "anulata");

  if (error) throw new Error(error.message);
}

async function undoBookingConfirmed(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select("status")
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.status !== "confirmata") {
    throw new Error("activity.undo_state_changed");
  }

  const { error: upErr } = await supabase
    .from("bookings")
    .update({
      status: "cerere_noua",
      confirmed_at: null,
      total_price: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (upErr) throw new Error(upErr.message);
}

async function undoOccupancyHold(entry: ActivityLogEntry): Promise<void> {
  const holdIds = metaStringArray(entry.metadata, "hold_ids");
  const singleId = metaString(entry.metadata, "hold_id");
  const ids = holdIds.length > 0 ? holdIds : singleId ? [singleId] : [];

  if (ids.length === 0) throw new Error("activity.undo_missing_metadata");

  for (const holdId of ids) {
    await releaseRoomHold(holdId, entry.actor_email);
  }
}

async function undoOccupancyBlock(entry: ActivityLogEntry): Promise<void> {
  const blockId = metaString(entry.metadata, "block_id") ?? entry.entity_id;
  if (!blockId) throw new Error("activity.undo_missing_metadata");
  await deleteRoomBlock(blockId);
}

async function undoBuildingPrice(entry: ActivityLogEntry): Promise<void> {
  const buildingId = entry.entity_id;
  const previous = entry.metadata.previous_price_per_night;
  if (!buildingId || previous == null) {
    throw new Error("activity.undo_missing_metadata");
  }
  await updateBuildingDefaultPrice(buildingId, Number(previous));
}

async function executeUndoHandler(entry: ActivityLogEntry): Promise<void> {
  switch (entry.action) {
    case "booking.shifted":
      return undoBookingShifted(entry);
    case "booking.checkin.set":
      return undoBookingCheckInSet(entry);
    case "booking.checkout.set":
      return undoBookingCheckOutSet(entry);
    case "booking.cancelled":
      return undoBookingCancelled(entry);
    case "booking.confirmed":
      return undoBookingConfirmed(entry);
    case "occupancy.hold_created":
      return undoOccupancyHold(entry);
    case "occupancy.block_created":
      return undoOccupancyBlock(entry);
    case "building.price_updated":
      return undoBuildingPrice(entry);
    default:
      throw new Error("activity.undo_not_supported");
  }
}

export async function undoActivityLogEntry(logId: string): Promise<void> {
  const entry = await getActivityLogEntryById(logId);
  if (!entry) throw new Error("activity.undo_not_found");
  if (!canUndoActivityEntry(entry)) throw new Error("activity.undo_not_allowed");
  if (!isUndoableAction(entry.action)) {
    throw new Error("activity.undo_not_supported");
  }

  const user = await getAdminUser();
  if (!user) throw new Error("auth.login_required");

  await executeUndoHandler(entry);
  await markActivityUndone(logId, user.id);

  await logAdminActivityFromSession({
    action: "activity.undone",
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    summary: `↩ ${entry.summary}`,
    metadata: {
      reverts_log_id: logId,
      original_action: entry.action,
    },
    revertsLogId: logId,
    undoable: false,
  });
}
