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
  getBookingById,
  rescheduleBookingDates,
  undoBookingCheckIn,
  undoBookingCheckOut,
} from "@/services/bookings";
import { updateBuildingDefaultPrice } from "@/services/buildings";
import { deleteRoomBlock } from "@/services/room-blocks";
import { releaseRoomHold } from "@/services/room-holds";
import { syncBookingRoomSegments } from "@/services/booking-segments";

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

  // If this was an edit (has previous_at), restore the previous value
  const previousAt = metaString(entry.metadata, "previous_at");
  if (previousAt) {
    const { tenantId, supabase } = await getTenantScope();
    const { error } = await supabase
      .from("bookings")
      .update({ actual_check_in_at: previousAt })
      .eq("tenant_id", tenantId)
      .eq("id", bookingId);
    if (error) throw new Error(error.message);
    return;
  }

  await undoBookingCheckIn(bookingId);
}

async function undoBookingCheckOutSet(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");

  // If this was an edit (has previous_at), restore the previous value
  const previousAt = metaString(entry.metadata, "previous_at");
  if (previousAt) {
    const { tenantId, supabase } = await getTenantScope();
    const { error } = await supabase
      .from("bookings")
      .update({ actual_check_out_at: previousAt })
      .eq("tenant_id", tenantId)
      .eq("id", bookingId);
    if (error) throw new Error(error.message);
    return;
  }

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

async function undoBookingDatesEdited(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");

  const prevIn = metaString(entry.metadata, "prev_check_in");
  const prevOut = metaString(entry.metadata, "prev_check_out");
  const prevAdults = entry.metadata.prev_num_adults;
  const prevChildren = entry.metadata.prev_num_children;

  if (!prevIn || !prevOut) throw new Error("activity.undo_missing_metadata");

  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("bookings")
    .update({
      check_in: prevIn,
      check_out: prevOut,
      num_adults: prevAdults != null ? Number(prevAdults) : undefined,
      num_children: prevChildren != null ? Number(prevChildren) : undefined,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await syncBookingRoomSegments(bookingId).catch(() => {});
}

async function undoBookingRoomMoved(entry: ActivityLogEntry): Promise<void> {
  const bookingId = entry.entity_id;
  if (!bookingId) throw new Error("activity.undo_missing_booking");

  const moveMode = metaString(entry.metadata, "move_mode");
  if (moveMode !== "full") {
    throw new Error("activity.undo_not_supported");
  }

  const sourceRoomId = metaString(entry.metadata, "source_room_id");
  const targetRoomId = metaString(entry.metadata, "target_room_id");
  if (!sourceRoomId || !targetRoomId) {
    throw new Error("activity.undo_missing_metadata");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");

  // Reverse the move: target → source
  const { tenantId, supabase } = await getTenantScope();

  // Update segment
  const { error: segErr } = await supabase
    .from("booking_room_segments")
    .update({ room_id: sourceRoomId })
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .eq("room_id", targetRoomId);
  if (segErr) throw new Error(segErr.message);

  // Update booking_rooms
  const { error: brErr } = await supabase
    .from("booking_rooms")
    .update({ room_id: sourceRoomId })
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .eq("room_id", targetRoomId);
  if (brErr) throw new Error(brErr.message);
}

async function undoCheckinCreated(entry: ActivityLogEntry): Promise<void> {
  const checkinId = entry.entity_id;
  if (!checkinId) throw new Error("activity.undo_missing_metadata");

  const bookingId = metaString(entry.metadata, "booking_id");

  const { tenantId, supabase } = await getTenantScope();

  // Delete the checkin record (cascade deletes checkin_guests)
  const { error: delErr } = await supabase
    .from("checkins")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", checkinId);
  if (delErr) throw new Error(delErr.message);

  // Clear the booking's actual_check_in_at
  if (bookingId) {
    const { error: upErr } = await supabase
      .from("bookings")
      .update({ actual_check_in_at: null, actual_check_in_by: null })
      .eq("tenant_id", tenantId)
      .eq("id", bookingId);
    if (upErr) throw new Error(upErr.message);
  }
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
    case "booking.dates_edited":
      return undoBookingDatesEdited(entry);
    case "booking.room_moved":
      return undoBookingRoomMoved(entry);
    case "occupancy.hold_created":
      return undoOccupancyHold(entry);
    case "occupancy.block_created":
      return undoOccupancyBlock(entry);
    case "building.price_updated":
      return undoBuildingPrice(entry);
    case "checkin.created":
      return undoCheckinCreated(entry);
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
