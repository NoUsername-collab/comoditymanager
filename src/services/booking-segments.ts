import { createAdminClient } from "@/lib/supabase/admin";

/** Rescrie segmentele unui booking din booking_rooms + datele bookingului. */
export async function syncBookingRoomSegments(bookingId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr) throw new Error(bErr.message);
  if (!booking || booking.status === "anulata") {
    await supabase
      .from("booking_room_segments")
      .delete()
      .eq("booking_id", bookingId);
    return;
  }

  const { data: rooms, error: rErr } = await supabase
    .from("booking_rooms")
    .select("room_id")
    .eq("booking_id", bookingId);

  if (rErr) throw new Error(rErr.message);

  const { error: delErr } = await supabase
    .from("booking_room_segments")
    .delete()
    .eq("booking_id", bookingId);
  if (delErr) throw new Error(delErr.message);

  const roomIds = (rooms ?? []).map((r) => r.room_id).filter(Boolean);
  if (roomIds.length === 0) return;

  const { error: insErr } = await supabase.from("booking_room_segments").insert(
    roomIds.map((room_id) => ({
      booking_id: bookingId,
      room_id,
      segment_start: booking.check_in,
      segment_end: booking.check_out,
    }))
  );
  if (insErr) throw new Error(insErr.message);
}

/** Rescrie toate segmentele active (migrare / reparare). */
export async function resyncAllBookingSegments(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .neq("status", "anulata");

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    await syncBookingRoomSegments(row.id);
  }
  return data?.length ?? 0;
}
