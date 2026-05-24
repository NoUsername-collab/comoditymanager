import { isAtLeastOneNight } from "@/domain/booking/conflict";
import {
  resolveMovePivot,
  type BookingRoomSegmentRow,
} from "@/domain/booking/segment-types";
import { computeBookingTotalFromSegments } from "@/domain/pricing/segment-total";
import { addDays, stayNightCount } from "@/lib/stay-dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

async function roomNightlyRate(roomId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("price_per_night")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Camera nu există.");
  return Number(data.price_per_night);
}

export async function listSegmentsForBooking(
  bookingId: string
): Promise<BookingRoomSegmentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("booking_room_segments")
    .select("id, booking_id, room_id, segment_start, segment_end, nightly_rate")
    .eq("booking_id", bookingId)
    .order("segment_start");

  if (error) throw new Error(error.message);
  return (data ?? []) as BookingRoomSegmentRow[];
}

export async function bookingHasSplitSegments(bookingId: string): Promise<boolean> {
  const segments = await listSegmentsForBooking(bookingId);
  if (segments.length <= 1) return false;

  const supabase = createAdminClient();
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("id", bookingId)
    .maybeSingle();
  if (bErr) throw new Error(bErr.message);
  if (!booking) return false;

  const { count, error } = await supabase
    .from("booking_rooms")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  if (error) throw new Error(error.message);

  if (segments.length > (count ?? 0)) return true;

  const roomsWithMulti = new Set(segments.map((s) => s.room_id));
  if (segments.length > roomsWithMulti.size) return true;

  return segments.some(
    (s) =>
      s.segment_start !== booking.check_in || s.segment_end !== booking.check_out
  );
}

async function recalcBookingEnvelopeAndTotal(bookingId: string): Promise<void> {
  const supabase = createAdminClient();
  const segments = await listSegmentsForBooking(bookingId);
  if (segments.length === 0) return;

  const checkIn = segments.reduce(
    (min, s) => (s.segment_start < min ? s.segment_start : min),
    segments[0]!.segment_start
  );
  const checkOut = segments.reduce(
    (max, s) => (s.segment_end > max ? s.segment_end : max),
    segments[0]!.segment_end
  );
  const total = computeBookingTotalFromSegments(segments);

  const { error } = await supabase
    .from("bookings")
    .update({ check_in: checkIn, check_out: checkOut, total_price: total })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);
}

/** Rescrie segmentele din booking_rooms — doar dacă nu există split-uri. */
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

  if (await bookingHasSplitSegments(bookingId)) return;

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

  const inserts = [];
  for (const room_id of roomIds) {
    const rate = await roomNightlyRate(room_id);
    inserts.push({
      booking_id: bookingId,
      room_id,
      segment_start: booking.check_in,
      segment_end: booking.check_out,
      nightly_rate: rate,
    });
  }

  const { error: insErr } = await supabase
    .from("booking_room_segments")
    .insert(inserts);
  if (insErr) throw new Error(insErr.message);
}

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

export async function shiftAllSegmentsByDays(
  bookingId: string,
  dayDelta: number
): Promise<void> {
  const segments = await listSegmentsForBooking(bookingId);
  if (segments.length === 0) return;

  const supabase = createAdminClient();
  for (const seg of segments) {
    const { error } = await supabase
      .from("booking_room_segments")
      .update({
        segment_start: addDays(seg.segment_start, dayDelta),
        segment_end: addDays(seg.segment_end, dayDelta),
      })
      .eq("id", seg.id);
    if (error) throw new Error(error.message);
  }

  await recalcBookingEnvelopeAndTotal(bookingId);
}

export type RoomMovePreview = {
  pivot: string;
  sourceRoomId: string;
  targetRoomId: string;
  sourceSegment: { start: string; end: string; nights: number; total: number };
  targetSegment: { start: string; end: string; nights: number; total: number };
  newTotal: number;
  oldTotal: number;
};

export async function previewRoomMoveFromPivot(input: {
  bookingId: string;
  sourceRoomId: string;
  targetRoomId: string;
  pivotDate?: string;
}): Promise<RoomMovePreview> {
  const segments = await listSegmentsForBooking(input.bookingId);
  const source = segments.find((s) => s.room_id === input.sourceRoomId);
  if (!source) throw new Error("Segment sursă negăsit.");

  const pivot = resolveMovePivot(
    source.segment_start,
    source.segment_end,
    input.pivotDate
  );
  const targetRate = await roomNightlyRate(input.targetRoomId);

  const oldTotal = computeBookingTotalFromSegments(segments);
  const nextSegments = segments.flatMap((s) => {
    if (s.id !== source.id) return [s];
    return [
      { ...s, segment_end: pivot },
      {
        ...s,
        id: "new",
        room_id: input.targetRoomId,
        segment_start: pivot,
        segment_end: source.segment_end,
        nightly_rate: targetRate,
      },
    ];
  });
  const newTotal = computeBookingTotalFromSegments(nextSegments);

  return {
    pivot,
    sourceRoomId: input.sourceRoomId,
    targetRoomId: input.targetRoomId,
    sourceSegment: {
      start: source.segment_start,
      end: pivot,
      nights: stayNightCount(source.segment_start, pivot),
      total: computeBookingTotalFromSegments([
        { ...source, segment_end: pivot },
      ]),
    },
    targetSegment: {
      start: pivot,
      end: source.segment_end,
      nights: stayNightCount(pivot, source.segment_end),
      total: computeBookingTotalFromSegments([
        {
          segment_start: pivot,
          segment_end: source.segment_end,
          nightly_rate: targetRate,
        },
      ]),
    },
    newTotal,
    oldTotal,
  };
}

/** Mută camera de la pivot înainte — split card pe timeline. */
export async function moveBookingRoomFromPivot(input: {
  bookingId: string;
  sourceRoomId: string;
  targetRoomId: string;
  pivotDate?: string;
}): Promise<void> {
  if (input.sourceRoomId === input.targetRoomId) {
    throw new Error("Alege o cameră diferită.");
  }

  const supabase = createAdminClient();
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, status, guest_name")
    .eq("id", input.bookingId)
    .maybeSingle();
  if (bErr) throw new Error(bErr.message);
  if (!booking) throw new Error("Rezervarea nu există.");
  if (booking.status === "anulata") {
    throw new Error("Rezervarea este anulată.");
  }
  if (booking.status !== "confirmata") {
    throw new Error("Mutarea camerei e disponibilă doar pentru cazări confirmate.");
  }

  const segments = await listSegmentsForBooking(input.bookingId);
  const source = segments.find((s) => s.room_id === input.sourceRoomId);
  if (!source) throw new Error("Segment sursă negăsit.");

  const pivot = resolveMovePivot(
    source.segment_start,
    source.segment_end,
    input.pivotDate
  );

  await assertRoomsAvailableForOccupancy(
    pivot,
    source.segment_end,
    [input.targetRoomId],
    input.bookingId
  );

  const targetRate = await roomNightlyRate(input.targetRoomId);

  const { error: truncErr } = await supabase
    .from("booking_room_segments")
    .update({ segment_end: pivot })
    .eq("id", source.id);
  if (truncErr) throw new Error(truncErr.message);

  const { error: insErr } = await supabase.from("booking_room_segments").insert({
    booking_id: input.bookingId,
    room_id: input.targetRoomId,
    segment_start: pivot,
    segment_end: source.segment_end,
    nightly_rate: targetRate,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: brErr } = await supabase
    .from("booking_rooms")
    .update({ room_id: input.targetRoomId })
    .eq("booking_id", input.bookingId)
    .eq("room_id", input.sourceRoomId);
  if (brErr) throw new Error(brErr.message);

  await recalcBookingEnvelopeAndTotal(input.bookingId);

  await logAdminActivityFromSession({
    action: "booking.room_moved",
    entityType: "booking",
    entityId: input.bookingId,
    summary: `Mutare cameră: ${booking.guest_name} · pivot ${pivot}`,
    metadata: {
      source_room_id: input.sourceRoomId,
      target_room_id: input.targetRoomId,
      pivot,
    },
  });
}
