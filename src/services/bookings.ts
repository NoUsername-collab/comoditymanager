import { unstable_cache } from "next/cache";
import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
} from "@/domain/guest/types";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { isSimActive } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import type { BookingStatus } from "@/domain/booking/types";
import { addDays, parseIso, todayIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  bookingHasSplitSegments,
  shiftAllSegmentsByDays,
  syncBookingRoomSegments,
} from "@/services/booking-segments";
import {
  assertValidGuestPhone,
  isValidGuestPhone,
  normalizePhone,
} from "@/domain/guest/normalize";
import { resolveGuestForBooking } from "@/services/guests";
import {
  listGuestProfileSummaries,
  resolveGuestAlertSnapshot,
} from "@/services/guest-profiles";
import {
  assertRoomsAvailableForOccupancy,
  listOccupiedRoomRanges,
} from "@/services/room-occupancy";
import { getAdminUser } from "@/lib/auth/require-admin";
import { parseOperationalTimestamp } from "@/lib/operational-check";

export { listOccupiedRoomRanges };

const BOOKING_ROW_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, total_price,
  actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
  booking_rooms ( room_id, rooms ( name ) )
`;

const BOOKING_ROW_WITH_UPDATED_SELECT = `
  ${BOOKING_ROW_SELECT.trim()},
  updated_at
`;

export type BookingRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: string | null;
  guest_alert_level: GuestFlagLevel;
  guest_alert_note: string | null;
  guest_profile: GuestBookingFlagSummary | null;
  num_adults: number;
  num_children: number;
  room_ids: string[];
  room_names: string[];
  total_price: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  actual_check_in_by: string | null;
  actual_check_out_by: string | null;
};

type BookingSelectRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: string | null;
  guest_alert_level: GuestFlagLevel;
  guest_alert_note: string | null;
  num_adults: number;
  num_children: number;
  total_price: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  actual_check_in_by: string | null;
  actual_check_out_by: string | null;
  booking_rooms:
    | {
        room_id: string;
        rooms: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function mapBookingRows(rows: BookingSelectRow[]): BookingRow[] {
  return rows.map((b) => {
    const room_ids: string[] = [];
    const room_names: string[] = [];

    for (const line of b.booking_rooms ?? []) {
      room_ids.push(line.room_id);
      const room = line.rooms;
      const name = Array.isArray(room) ? room[0]?.name : room?.name;
      if (name) room_names.push(name);
    }

    return {
      id: b.id,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status as BookingStatus,
      guest_name: b.guest_name,
      guest_last_name: b.guest_last_name ?? null,
      guest_first_name: b.guest_first_name ?? null,
      guest_email: b.guest_email,
      guest_phone: b.guest_phone,
      guest_id: b.guest_id ?? null,
      guest_alert_level:
        b.guest_alert_level === "watchlist" || b.guest_alert_level === "blacklist"
          ? b.guest_alert_level
          : "normal",
      guest_alert_note: b.guest_alert_note ?? null,
      guest_profile: null,
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
      actual_check_in_at: b.actual_check_in_at ?? null,
      actual_check_out_at: b.actual_check_out_at ?? null,
      actual_check_in_by: b.actual_check_in_by ?? null,
      actual_check_out_by: b.actual_check_out_by ?? null,
    };
  });
}

async function attachGuestProfiles(rows: BookingRow[]): Promise<BookingRow[]> {
  const guestIds = rows.map((row) => row.guest_id).filter(Boolean) as string[];
  if (guestIds.length === 0) return rows;

  const profiles = await listGuestProfileSummaries(guestIds);
  return rows.map((row) => ({
    ...row,
    guest_profile: row.guest_id ? profiles.get(row.guest_id) ?? null : null,
  }));
}

export async function listBookingsForRange(
  rangeStart: string,
  rangeEnd: string
): Promise<BookingRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .neq("status", "anulata")
    .lte("check_in", rangeEnd)
    .gte("check_out", rangeStart)
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

/** Verifică că camerele sunt libere pe interval (bookings, holds, blocks). */
export async function assertRoomsAvailableForStay(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  excludeBookingId?: string
): Promise<void> {
  await assertRoomsAvailableForOccupancy(
    checkIn,
    checkOut,
    roomIds,
    excludeBookingId
  );
}

/** Alocă camere pe cerere (soft hold) — blochează calendarul până la confirmare/anulare. */
export async function assignBookingRoomHold(
  bookingId: string,
  roomIds: string[]
): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.request_not_found");
  if (booking.status === "anulata") throw new Error("booking.request_cancelled");
  if (booking.status === "confirmata") {
    throw new Error("booking.already_confirmed");
  }

  const unique = [...new Set(roomIds.filter(Boolean))];
  await assertRoomsAvailableForStay(
    booking.check_in,
    booking.check_out,
    unique,
    bookingId
  );

  const supabase = await createAdminClient();
  const { error: delError } = await supabase
    .from("booking_rooms")
    .delete()
    .eq("booking_id", bookingId);
  if (delError) throw new Error(delError.message);

  const { error: insError } = await supabase.from("booking_rooms").insert(
    unique.map((room_id) => ({
      booking_id: bookingId,
      room_id,
      extra_beds: 0,
    }))
  );
  if (insError) throw new Error(insError.message);
  await syncBookingRoomSegments(bookingId);
}

async function rollbackFailedBookingRequest(bookingId: string): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.from("booking_rooms").delete().eq("booking_id", bookingId);
  await supabase
    .from("bookings")
    .update({ status: "anulata" })
    .eq("id", bookingId);
}

export async function createBookingRequest(input: {
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_last_name: string;
  guest_first_name: string;
  guest_email: string;
  guest_phone: string;
  num_adults: number;
  num_children: number;
  has_minor: boolean;
  minor_age: string;
  notes: string;
  total_price?: number | null;
  /** Soft hold: camere blocate provizoriu (status rămâne cerere_noua). */
  room_ids?: string[];
}): Promise<string> {
  assertValidGuestPhone(input.guest_phone);

  const holdRooms = input.room_ids?.length
    ? [...new Set(input.room_ids.filter(Boolean))]
    : [];

  if (holdRooms.length > 0) {
    await assertRoomsAvailableForStay(
      input.check_in,
      input.check_out,
      holdRooms
    );
  }

  const supabase = await createAdminClient();

  const { guestId, mergeConflict } = await resolveGuestForBooking({
    guest_name: input.guest_name,
    guest_last_name: input.guest_last_name,
    guest_first_name: input.guest_first_name,
    guest_email: input.guest_email,
    guest_phone: input.guest_phone,
  });
  const guestAlert = await resolveGuestAlertSnapshot({
    guestId,
    guestLastName: input.guest_last_name,
    guestFirstName: input.guest_first_name,
  });

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      check_in: input.check_in,
      check_out: input.check_out,
      status: "cerere_noua",
      guest_name: input.guest_name.trim(),
      guest_last_name: input.guest_last_name.trim(),
      guest_first_name: input.guest_first_name.trim(),
      guest_email: input.guest_email.trim(),
      guest_phone: input.guest_phone.trim(),
      guest_id: guestId,
      guest_alert_level: guestAlert.level,
      guest_alert_note: guestAlert.note,
      num_adults: input.num_adults,
      num_children: input.num_children,
      has_minor: input.has_minor,
      minor_age: input.has_minor ? input.minor_age.trim() : null,
      notes: input.notes.trim() || null,
      total_price: input.total_price ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (holdRooms.length > 0) {
    try {
      await assignBookingRoomHold(data.id, holdRooms);
    } catch (e) {
      await rollbackFailedBookingRequest(data.id);
      throw e;
    }
  }

  await logAdminActivity({
    action: "booking.request_created",
    entityType: "booking",
    entityId: data.id,
    summary: `Cerere nouă: ${input.guest_name.trim()}`,
    metadata: {
      check_in: input.check_in,
      check_out: input.check_out,
      guest_email: input.guest_email.trim(),
      guest_id: guestId,
      guest_alert_level: guestAlert.level,
      guest_alert_note: guestAlert.note,
      ...(mergeConflict ? { guest_merge_conflict: true } : {}),
      ...(holdRooms.length > 0
        ? { room_ids: holdRooms, soft_hold: true }
        : {}),
    },
    actor: null,
  });

  if (guestAlert.level !== "normal") {
    await logAdminActivity({
      action: "booking.flagged",
      entityType: "booking",
      entityId: data.id,
      summary: `Cerere cu alertă client: ${input.guest_name.trim()}`,
      metadata: {
        guest_alert_level: guestAlert.level,
        guest_alert_note: guestAlert.note,
      },
      actor: null,
    });
  }

  return data.id;
}

export type BookingDetail = BookingRow & {
  has_minor: boolean;
  minor_age: string | null;
  notes: string | null;
  total_price: number | null;
};

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
      num_adults, num_children, has_minor, minor_age, notes, total_price,
      actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const br = (data.booking_rooms ?? []) as {
    room_id: string;
    rooms: { name: string } | { name: string }[] | null;
  }[];
  const room_ids: string[] = [];
  const room_names: string[] = [];
  for (const line of br) {
    room_ids.push(line.room_id);
    const r = line.rooms;
    const name = Array.isArray(r) ? r[0]?.name : r?.name;
    if (name) room_names.push(name);
  }
  const profiles = await listGuestProfileSummaries(
    data.guest_id ? [String(data.guest_id)] : []
  );

  return {
    id: data.id,
    check_in: data.check_in,
    check_out: data.check_out,
    status: data.status as BookingStatus,
    guest_name: data.guest_name,
    guest_last_name: data.guest_last_name ?? null,
    guest_first_name: data.guest_first_name ?? null,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
    guest_id: data.guest_id ?? null,
    guest_alert_level:
      data.guest_alert_level === "watchlist" || data.guest_alert_level === "blacklist"
        ? data.guest_alert_level
        : "normal",
    guest_alert_note: data.guest_alert_note ?? null,
    guest_profile: data.guest_id ? profiles.get(String(data.guest_id)) ?? null : null,
    num_adults: data.num_adults,
    num_children: data.num_children,
    has_minor: data.has_minor,
    minor_age: data.minor_age,
    notes: data.notes,
    total_price: data.total_price != null ? Number(data.total_price) : null,
    actual_check_in_at: data.actual_check_in_at ?? null,
    actual_check_out_at: data.actual_check_out_at ?? null,
    actual_check_in_by: data.actual_check_in_by ?? null,
    actual_check_out_by: data.actual_check_out_by ?? null,
    room_ids,
    room_names,
  };
}

async function countCereriNoiUncached(): Promise<number> {
  const supabase = await createAdminClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "cerere_noua");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const getCachedCereriCount = unstable_cache(countCereriNoiUncached, undefined, {
  tags: [CACHE_TAGS.bookingCounts],
  revalidate: 30,
});

export async function countCereriNoi(): Promise<number> {
  return getCachedCereriCount();
}

/** Cereri noi fără camere alocate — vizibile indiferent de perioada Gantt */
export async function listUnassignedCereri(): Promise<BookingRow[]> {
  const rows = await listCereriNoi();
  return rows
    .filter((b) => b.room_ids.length === 0)
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
}

export async function listCereriNoi(): Promise<BookingRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("status", "cerere_noua")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

export type OperationalStayRow = BookingRow;

/** Cazări active: cereri noi + confirmate (fără anulate). */
export async function listOperationalStays(): Promise<OperationalStayRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .in("status", ["cerere_noua", "confirmata"])
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

export type CompletedStayHistoryRow = BookingRow;

/** Istoric cazări deja încheiate, util pentru sidebar-uri și recap rapid. */
export async function listCompletedStayHistory(
  limit = 24
): Promise<CompletedStayHistoryRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("status", "confirmata")
    .lt("check_out", await getEffectiveToday())
    .order("check_out", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

export type CancelledStayHistoryRow = BookingRow & { updated_at: string };

/** Cereri/cazări anulate recent — pentru recontact când se eliberează loc. */
export async function listCancelledStayHistory(
  limit = 24
): Promise<CancelledStayHistoryRow[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_WITH_UPDATED_SELECT)
    .eq("status", "anulata")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  type RowWithUpdated = BookingSelectRow & { updated_at: string };
  const raw = (data ?? []) as unknown as RowWithUpdated[];
  const mapped = await attachGuestProfiles(mapBookingRows(raw));
  return mapped.map((row, index) => ({
    ...row,
    updated_at: raw[index]?.updated_at ?? new Date().toISOString(),
  }));
}

export async function confirmBookingWithRooms(
  bookingId: string,
  roomIds: string[],
  totalPrice: number
): Promise<void> {
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw new Error("booking.total_price_required_on_confirm");
  }
  const { assertRoomsAssignableForBooking } = await import(
    "@/services/booking-confirm"
  );
  await assertRoomsAssignableForBooking(bookingId, roomIds);

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.request_not_found");
  if (booking.status === "anulata") throw new Error("booking.request_cancelled");
  if (booking.status === "confirmata") throw new Error("booking.already_confirmed");

  const simActive = await isSimActive();

  if (simActive) {
    // Simulation mode: use individual operations on sim_sandbox schema.
    // Atomicity is not critical for throwaway simulation data.
    const supabase = await createAdminClient();

    await supabase.from("booking_rooms").delete().eq("booking_id", bookingId);

    const { error: brError } = await supabase.from("booking_rooms").insert(
      roomIds.map((room_id) => ({
        booking_id: bookingId,
        room_id,
        extra_beds: 0,
      }))
    );
    if (brError) throw new Error(brError.message);

    const { error: upError } = await supabase
      .from("bookings")
      .update({
        status: "confirmata",
        total_price: totalPrice,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (upError) throw new Error(upError.message);

    await syncBookingRoomSegments(bookingId);
  } else {
    // Production: use atomic RPC — all DB operations run in a single
    // transaction so a crash can never orphan room assignments.
    const supabase = createPublicAdminClient();

    const { error: rpcError } = await supabase.rpc(
      "confirm_booking_with_rooms",
      {
        p_booking_id: bookingId,
        p_room_ids: roomIds,
        p_total_price: totalPrice,
      }
    );
    if (rpcError) throw new Error(rpcError.message);
  }

  await logAdminActivityFromSession({
    action: "booking.confirmed",
    entityType: "booking",
    entityId: bookingId,
    summary: `Confirmată: ${booking.guest_name}`,
    metadata: {
      room_ids: roomIds,
      total_price: totalPrice,
      check_in: booking.check_in,
      check_out: booking.check_out,
    },
  });
}

export async function rescheduleBookingDates(
  bookingId: string,
  newCheckIn: string,
  newCheckOut: string
): Promise<void> {
  if (!isAtLeastOneNight(newCheckIn, newCheckOut)) {
    throw new Error("booking.minimum_one_night_required");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.cannot_shift_cancelled");
  }
  if (booking.room_ids.length === 0) {
    throw new Error("booking.assign_rooms_before_shift");
  }

  await assertRoomsAvailableForOccupancy(
    newCheckIn,
    newCheckOut,
    booking.room_ids,
    bookingId
  );

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      check_in: newCheckIn,
      check_out: newCheckOut,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  const dayDelta = Math.round(
    (parseIso(newCheckIn).getTime() - parseIso(booking.check_in).getTime()) /
      86400000
  );

  if (await bookingHasSplitSegments(bookingId)) {
    await shiftAllSegmentsByDays(bookingId, dayDelta);
  } else {
    await syncBookingRoomSegments(bookingId);
  }

  await logAdminActivityFromSession({
    action: "booking.shifted",
    entityType: "booking",
    entityId: bookingId,
    summary: `Mutată: ${booking.guest_name} → ${newCheckIn} … ${newCheckOut}`,
    metadata: {
      from_check_in: booking.check_in,
      from_check_out: booking.check_out,
      to_check_in: newCheckIn,
      to_check_out: newCheckOut,
    },
  });
}

/** Prelungește (+1) sau scurtează (−1) sejurul la checkout. */
export async function adjustBookingStayNights(
  bookingId: string,
  nightDelta: number
): Promise<{ check_in: string; check_out: string }> {
  if (nightDelta === 0 || !Number.isInteger(nightDelta)) {
    throw new Error("booking.invalid_adjustment");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.cannot_update_cancelled");
  }

  const newCheckOut = addDays(booking.check_out, nightDelta);
  if (!isAtLeastOneNight(booking.check_in, newCheckOut)) {
    throw new Error("booking.minimum_one_night_required");
  }

  if (booking.room_ids.length > 0) {
    await rescheduleBookingDates(bookingId, booking.check_in, newCheckOut);
  } else {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("bookings")
      .update({ check_out: newCheckOut })
      .eq("id", bookingId);
    if (error) throw new Error(error.message);
  }

  await logAdminActivityFromSession({
    action: "booking.shifted",
    entityType: "booking",
    entityId: bookingId,
    summary: `${nightDelta > 0 ? "Prelungit" : "Scurtat"}: ${booking.guest_name}`,
    metadata: {
      night_delta: nightDelta,
      check_in: booking.check_in,
      check_out: newCheckOut,
    },
  });

  return { check_in: booking.check_in, check_out: newCheckOut };
}

/** Duplică sejurul ca cerere nouă (rebook similar). */
export async function duplicateBookingAsCerere(bookingId: string): Promise<string> {
  const b = await getBookingById(bookingId);
  if (!b) throw new Error("booking.not_found");
  if (b.status === "anulata") {
    throw new Error("booking.cannot_duplicate_cancelled");
  }

  const id = await createBookingRequest({
    check_in: b.check_in,
    check_out: b.check_out,
    guest_name: b.guest_name,
    guest_last_name: b.guest_last_name ?? b.guest_name.split(" ")[0] ?? "",
    guest_first_name:
      b.guest_first_name ??
      b.guest_name.split(" ").slice(1).join(" ") ??
      "",
    guest_email: b.guest_email,
    guest_phone: b.guest_phone ?? "",
    num_adults: b.num_adults,
    num_children: b.num_children,
    has_minor: b.has_minor,
    minor_age: b.minor_age ?? "",
    notes: `[Duplicat] rebook similar · sursă ${bookingId.slice(0, 8)}`,
    room_ids: b.room_ids.length > 0 ? b.room_ids : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: id,
    summary: `Duplicat (rebook): ${b.guest_name}`,
    metadata: { source_booking_id: bookingId },
  });

  return id;
}

/** Mută rezervarea cu același număr de nopți (drag pe Gantt). */
export async function shiftBookingByDays(
  bookingId: string,
  dayDelta: number
): Promise<{ check_in: string; check_out: string }> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");

  const newCheckIn = addDays(booking.check_in, dayDelta);
  const newCheckOut = addDays(booking.check_out, dayDelta);
  await rescheduleBookingDates(bookingId, newCheckIn, newCheckOut);
  return { check_in: newCheckIn, check_out: newCheckOut };
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.already_cancelled");
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "anulata" })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);

  await syncBookingRoomSegments(bookingId);

  await logAdminActivityFromSession({
    action: "booking.cancelled",
    entityType: "booking",
    entityId: bookingId,
    summary: `Anulată: ${booking.guest_name}`,
    metadata: {
      previous_status: booking.status,
      check_in: booking.check_in,
      check_out: booking.check_out,
      room_ids: booking.room_ids,
      total_price: booking.total_price,
    },
  });
}

async function requireConfirmedBooking(bookingId: string) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status !== "confirmata") {
    throw new Error("booking.ops_only_for_confirmed");
  }
  return booking;
}

/** Check-in necesită telefon pe rezervare sau pe profilul client legat. */
async function ensureBookingPhoneForCheckIn(bookingId: string): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);

  if (isValidGuestPhone(booking.guest_phone)) return;

  if (booking.guest_id) {
    const supabase = await createAdminClient();
    const { data: guest, error } = await supabase
      .from("guests")
      .select("phone, phone_normalized")
      .eq("id", booking.guest_id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (guest && isValidGuestPhone(guest.phone)) {
      const phone = String(guest.phone).trim();
      const { error: upError } = await supabase
        .from("bookings")
        .update({
          guest_phone: phone,
        })
        .eq("id", bookingId);
      if (upError) throw new Error(upError.message);
      return;
    }
  }

  throw new Error("booking.phone_required_for_checkin");
}

export async function updateBookingGuestPhone(
  bookingId: string,
  rawPhone: string
): Promise<void> {
  assertValidGuestPhone(rawPhone);
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");

  const phone = rawPhone.trim();
  const phoneNorm = normalizePhone(phone);
  const supabase = await createAdminClient();

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ guest_phone: phone })
    .eq("id", bookingId);
  if (bookingError) throw new Error(bookingError.message);

  if (booking.guest_id && phoneNorm) {
    const { error: guestError } = await supabase
      .from("guests")
      .update({
        phone,
        phone_normalized: phoneNorm,
      })
      .eq("id", booking.guest_id);
    if (guestError) throw new Error(guestError.message);
  }

  await logAdminActivityFromSession({
    action: "guest.updated",
    entityType: "booking",
    entityId: bookingId,
    summary: `Telefon actualizat: ${booking.guest_name}`,
    metadata: { guest_id: booking.guest_id },
  });
}

export async function setBookingCheckIn(
  bookingId: string,
  at?: string | null
): Promise<void> {
  await ensureBookingPhoneForCheckIn(bookingId);
  const booking = await requireConfirmedBooking(bookingId);
  if (booking.actual_check_in_at) {
    throw new Error("booking.checkin_already_recorded");
  }
  if (booking.actual_check_out_at) {
    throw new Error("booking.checkin_after_checkout_not_allowed");
  }

  const ts = parseOperationalTimestamp(at);
  const user = await getAdminUser();
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: ts,
      actual_check_in_by: user?.id ?? null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkin.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-in: ${booking.guest_name}`,
    metadata: {
      at: ts,
      planned_check_in: booking.check_in,
      planned_check_out: booking.check_out,
    },
  });
}

export async function setBookingCheckOut(
  bookingId: string,
  at?: string | null
): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_required_before_checkout");
  }
  if (booking.actual_check_out_at) {
    throw new Error("booking.checkout_already_recorded");
  }

  const ts = parseOperationalTimestamp(at);
  const checkInAt = new Date(booking.actual_check_in_at);
  const checkOutAt = new Date(ts);
  if (checkOutAt < checkInAt) {
    throw new Error("booking.checkout_before_checkin_not_allowed");
  }

  const user = await getAdminUser();
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_out_at: ts,
      actual_check_out_by: user?.id ?? null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkout.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-out: ${booking.guest_name}`,
    metadata: {
      at: ts,
      actual_check_in_at: booking.actual_check_in_at,
      planned_check_out: booking.check_out,
    },
  });
}

export async function editBookingCheckIn(
  bookingId: string,
  at?: string | null
): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_not_recorded");
  }

  const ts = parseOperationalTimestamp(at);
  if (booking.actual_check_out_at) {
    const checkOutAt = new Date(booking.actual_check_out_at);
    const editedCheckInAt = new Date(ts);
    if (editedCheckInAt > checkOutAt) {
      throw new Error("booking.checkout_before_checkin_not_allowed");
    }
  }

  const user = await getAdminUser();
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: ts,
      actual_check_in_by: user?.id ?? null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkin.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-in editat: ${booking.guest_name}`,
    metadata: {
      previous_at: booking.actual_check_in_at,
      new_at: ts,
      actual_check_out_at: booking.actual_check_out_at,
    },
  });
}

export async function editBookingCheckOut(
  bookingId: string,
  at?: string | null
): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_required_before_checkout");
  }
  if (!booking.actual_check_out_at) {
    throw new Error("booking.checkout_not_recorded");
  }

  const ts = parseOperationalTimestamp(at);
  const checkInAt = new Date(booking.actual_check_in_at);
  const editedCheckOutAt = new Date(ts);
  if (editedCheckOutAt < checkInAt) {
    throw new Error("booking.checkout_before_checkin_not_allowed");
  }

  const user = await getAdminUser();
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_out_at: ts,
      actual_check_out_by: user?.id ?? null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkout.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-out editat: ${booking.guest_name}`,
    metadata: {
      previous_at: booking.actual_check_out_at,
      new_at: ts,
      actual_check_in_at: booking.actual_check_in_at,
    },
  });
}

export async function undoBookingCheckIn(bookingId: string): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_not_recorded");
  }
  if (booking.actual_check_out_at) {
    throw new Error("booking.undo_checkout_first");
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: null,
      actual_check_in_by: null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkin.undo",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-in anulat: ${booking.guest_name}`,
    metadata: { previous_at: booking.actual_check_in_at },
  });
}

export async function undoBookingCheckOut(bookingId: string): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_out_at) {
    throw new Error("booking.checkout_not_recorded");
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_out_at: null,
      actual_check_out_by: null,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkout.undo",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-out anulat: ${booking.guest_name}`,
    metadata: { previous_at: booking.actual_check_out_at },
  });
}
