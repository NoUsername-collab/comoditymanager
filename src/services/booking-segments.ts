import { isAtLeastOneNight } from "@/domain/booking/conflict";
import {
  type BookingRoomSegmentRow,
} from "@/domain/booking/segment-types";
import { computeBookingTotalFromSegments } from "@/domain/pricing/segment-total";
import { addDays, stayNightCount, todayIso } from "@/lib/stay-dates";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";

async function roomNightlyRate(roomId: string): Promise<number> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("rooms")
    .select("price_per_night")
    .eq("tenant_id", tenantId)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("room.not_found");
  return Number(data.price_per_night);
}

type RoomMovePlan =
  | {
      mode: "full";
      effectiveStart: string;
    }
  | {
      mode: "split";
      effectiveStart: string;
      pivot: string;
    };

function resolveRoomMovePlan(
  segmentStart: string,
  segmentEnd: string,
  requestedPivot?: string,
  today: string = todayIso()
): RoomMovePlan {
  const pivot = requestedPivot && requestedPivot > today ? requestedPivot : today;

  // If the stay has not started yet, moving rooms should reassign the whole segment,
  // not create an artificial split after the first night.
  if (pivot <= segmentStart) {
    return {
      mode: "full",
      effectiveStart: segmentStart,
    };
  }

  if (pivot >= segmentEnd) {
    throw new Error("segments.no_future_nights_to_move");
  }
  if (!isAtLeastOneNight(segmentStart, pivot)) {
    throw new Error("segments.past_segment_must_keep_min_one_night");
  }
  if (!isAtLeastOneNight(pivot, segmentEnd)) {
    throw new Error("segments.new_segment_must_have_min_one_night");
  }

  return {
    mode: "split",
    effectiveStart: pivot,
    pivot,
  };
}

export async function listSegmentsForBooking(
  bookingId: string
): Promise<BookingRoomSegmentRow[]> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("booking_room_segments")
    .select("id, booking_id, room_id, segment_start, segment_end, nightly_rate")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .order("segment_start");

  if (error) throw new Error(error.message);
  return (data ?? []) as BookingRoomSegmentRow[];
}

export async function bookingHasSplitSegments(bookingId: string): Promise<boolean> {
  const segments = await listSegmentsForBooking(bookingId);
  if (segments.length <= 1) return false;

  const { tenantId, supabase } = await getTenantScope();
  const [
    { data: booking, error: bErr },
    { count, error },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("check_in, check_out")
      .eq("tenant_id", tenantId)
      .eq("id", bookingId)
      .maybeSingle(),
    supabase
      .from("booking_rooms")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId),
  ]);
  if (bErr) throw new Error(bErr.message);
  if (!booking) return false;
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
  const { tenantId, supabase } = await getTenantScope();
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
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);
  if (error) throw new Error(error.message);
}

/** Rescrie segmentele din booking_rooms — doar dacă nu există split-uri. */
export async function syncBookingRoomSegments(bookingId: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, status")
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .maybeSingle();

  if (bErr) throw new Error(bErr.message);
  if (!booking || booking.status === "anulata") {
    await supabase
      .from("booking_room_segments")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId);
    return;
  }

  if (await bookingHasSplitSegments(bookingId)) return;

  const { data: rooms, error: rErr } = await supabase
    .from("booking_rooms")
    .select("room_id")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);

  if (rErr) throw new Error(rErr.message);

  const { error: delErr } = await supabase
    .from("booking_room_segments")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);
  if (delErr) throw new Error(delErr.message);

  const roomIds = (rooms ?? []).map((r) => r.room_id).filter(Boolean);
  if (roomIds.length === 0) return;

  const inserts = [];
  for (const room_id of roomIds) {
    const rate = await roomNightlyRate(room_id);
    inserts.push(
      withTenantId(tenantId, {
        booking_id: bookingId,
        room_id,
        segment_start: booking.check_in,
        segment_end: booking.check_out,
        nightly_rate: rate,
      })
    );
  }

  const { error: insErr } = await supabase
    .from("booking_room_segments")
    .insert(inserts);
  if (insErr) throw new Error(insErr.message);
}

export async function resyncAllBookingSegments(): Promise<number> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("tenant_id", tenantId)
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

  const { tenantId, supabase } = await getTenantScope();
  for (const seg of segments) {
    const { error } = await supabase
      .from("booking_room_segments")
      .update({
        segment_start: addDays(seg.segment_start, dayDelta),
        segment_end: addDays(seg.segment_end, dayDelta),
      })
      .eq("tenant_id", tenantId)
      .eq("id", seg.id);
    if (error) throw new Error(error.message);
  }

  await recalcBookingEnvelopeAndTotal(bookingId);
}

export type RoomMovePreview = {
  mode: "full" | "split";
  pivot: string | null;
  sourceRoomId: string;
  targetRoomId: string;
  sourceSegment: { start: string; end: string; nights: number; total: number } | null;
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
  if (!source) throw new Error("segments.source_not_found");

  const effectiveToday = await getEffectiveToday();
  const plan = resolveRoomMovePlan(
    source.segment_start,
    source.segment_end,
    input.pivotDate,
    effectiveToday
  );
  const targetRate = await roomNightlyRate(input.targetRoomId);

  const oldTotal = computeBookingTotalFromSegments(segments);
  const nextSegments = segments.flatMap((s) => {
    if (s.id !== source.id) return [s];
    if (plan.mode === "full") {
      return [
        {
          ...s,
          room_id: input.targetRoomId,
          nightly_rate: targetRate,
        },
      ];
    }
    return [
      { ...s, segment_end: plan.pivot },
      {
        ...s,
        id: "new",
        room_id: input.targetRoomId,
        segment_start: plan.pivot,
        segment_end: source.segment_end,
        nightly_rate: targetRate,
      },
    ];
  });
  const newTotal = computeBookingTotalFromSegments(nextSegments);

  return {
    mode: plan.mode,
    pivot: plan.mode === "split" ? plan.pivot : null,
    sourceRoomId: input.sourceRoomId,
    targetRoomId: input.targetRoomId,
    sourceSegment:
      plan.mode === "split"
        ? {
            start: source.segment_start,
            end: plan.pivot,
            nights: stayNightCount(source.segment_start, plan.pivot),
            total: computeBookingTotalFromSegments([
              { ...source, segment_end: plan.pivot },
            ]),
          }
        : null,
    targetSegment: {
      start: plan.effectiveStart,
      end: source.segment_end,
      nights: stayNightCount(plan.effectiveStart, source.segment_end),
      total: computeBookingTotalFromSegments([
        {
          segment_start: plan.effectiveStart,
          segment_end: source.segment_end,
          nightly_rate: targetRate,
        },
      ]),
    },
    newTotal,
    oldTotal,
  };
}

/** Mută camera integral dacă sejurul nu a început; altfel face split de la pivot. */
export async function moveBookingRoomFromPivot(input: {
  bookingId: string;
  sourceRoomId: string;
  targetRoomId: string;
  pivotDate?: string;
}): Promise<void> {
  if (input.sourceRoomId === input.targetRoomId) {
    throw new Error("segments.choose_different_room");
  }

  // Parallel: resolve scope + fetch booking + list segments + get today
  const [{ tenantId, supabase }, segments, effectiveToday2] = await Promise.all([
    getTenantScope(),
    listSegmentsForBooking(input.bookingId),
    getEffectiveToday(),
  ]);

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, status, guest_name")
    .eq("tenant_id", tenantId)
    .eq("id", input.bookingId)
    .maybeSingle();
  if (bErr) throw new Error(bErr.message);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.cancelled");
  }
  if (booking.status !== "confirmata" && booking.status !== "cerere_noua") {
    throw new Error("segments.room_move_only_for_confirmed_stays");
  }

  const source = segments.find((s) => s.room_id === input.sourceRoomId);
  if (!source) throw new Error("segments.source_not_found");

  const plan = resolveRoomMovePlan(
    source.segment_start,
    source.segment_end,
    input.pivotDate,
    effectiveToday2
  );

  // Parallel: check availability + get target room price
  const [, targetRate] = await Promise.all([
    assertRoomsAvailableForOccupancy(
      plan.effectiveStart,
      source.segment_end,
      [input.targetRoomId],
      input.bookingId
    ),
    roomNightlyRate(input.targetRoomId),
  ]);

  if (plan.mode === "full") {
    const { error: updateErr } = await supabase
      .from("booking_room_segments")
      .update({
        room_id: input.targetRoomId,
        nightly_rate: targetRate,
      })
      .eq("tenant_id", tenantId)
      .eq("id", source.id);
    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { error: truncErr } = await supabase
      .from("booking_room_segments")
      .update({ segment_end: plan.pivot })
      .eq("tenant_id", tenantId)
      .eq("id", source.id);
    if (truncErr) throw new Error(truncErr.message);

    const { error: insErr } = await supabase.from("booking_room_segments").insert(
      withTenantId(tenantId, {
        booking_id: input.bookingId,
        room_id: input.targetRoomId,
        segment_start: plan.pivot,
        segment_end: source.segment_end,
        nightly_rate: targetRate,
      })
    );
    if (insErr) throw new Error(insErr.message);
  }

  if (plan.mode === "full") {
    const { error: brErr } = await supabase
      .from("booking_rooms")
      .update({ room_id: input.targetRoomId })
      .eq("tenant_id", tenantId)
      .eq("booking_id", input.bookingId)
      .eq("room_id", input.sourceRoomId);
    if (brErr) throw new Error(brErr.message);
  } else {
    const { error: brErr } = await supabase.from("booking_rooms").insert(
      withTenantId(tenantId, {
        booking_id: input.bookingId,
        room_id: input.targetRoomId,
        extra_beds: 0,
      })
    );
    if (brErr) throw new Error(brErr.message);
  }

  // Parallel: recalc totals + log activity (neither blocks the other)
  await Promise.all([
    recalcBookingEnvelopeAndTotal(input.bookingId),
    logAdminActivityFromSession({
      action: "booking.room_moved",
      entityType: "booking",
      entityId: input.bookingId,
      summary:
        plan.mode === "full"
          ? `Mutare cameră: ${booking.guest_name} · tot sejurul`
          : `Mutare cameră: ${booking.guest_name} · pivot ${plan.pivot}`,
      undoable: plan.mode === "full",
      metadata: {
        source_room_id: input.sourceRoomId,
        target_room_id: input.targetRoomId,
        move_mode: plan.mode,
        pivot: plan.mode === "split" ? plan.pivot : null,
      },
    }).catch(() => {}), // Activity log failure is non-fatal
  ]);
}
