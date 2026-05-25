import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import type { BookingStatus } from "@/domain/booking/types";
import { addDays, parseIso } from "@/lib/stay-dates";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  bookingHasSplitSegments,
  shiftAllSegmentsByDays,
  syncBookingRoomSegments,
} from "@/services/booking-segments";
import { resolveGuestForBooking } from "@/services/guests";
import {
  assertRoomsAvailableForOccupancy,
  listOccupiedRoomRanges,
} from "@/services/room-occupancy";

export { listOccupiedRoomRanges };

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
  num_adults: number;
  num_children: number;
  room_ids: string[];
  room_names: string[];
  total_price: number | null;
};

export async function listBookingsForRange(
  rangeStart: string,
  rangeEnd: string
): Promise<BookingRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id,
      num_adults, num_children, total_price,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .neq("status", "anulata")
    .lte("check_in", rangeEnd)
    .gte("check_out", rangeStart)
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((b) => {
    const br = (b.booking_rooms ?? []) as {
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
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
    };
  });
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
  if (!booking) throw new Error("Cererea nu există");
  if (booking.status === "anulata") throw new Error("Cererea e anulată");
  if (booking.status === "confirmata") {
    throw new Error("Rezervarea e deja confirmată.");
  }

  const unique = [...new Set(roomIds.filter(Boolean))];
  await assertRoomsAvailableForStay(
    booking.check_in,
    booking.check_out,
    unique,
    bookingId
  );

  const supabase = createAdminClient();
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
  const supabase = createAdminClient();
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

  const supabase = createAdminClient();

  const { guestId, mergeConflict } = await resolveGuestForBooking({
    guest_name: input.guest_name,
    guest_last_name: input.guest_last_name,
    guest_first_name: input.guest_first_name,
    guest_email: input.guest_email,
    guest_phone: input.guest_phone,
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
      guest_phone: input.guest_phone.trim() || null,
      guest_id: guestId,
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
      ...(mergeConflict ? { guest_merge_conflict: true } : {}),
      ...(holdRooms.length > 0
        ? { room_ids: holdRooms, soft_hold: true }
        : {}),
    },
    actor: null,
  });

  return data.id;
}

export type BookingDetail = BookingRow & {
  has_minor: boolean;
  minor_age: string | null;
  notes: string | null;
  total_price: number | null;
};

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id,
      num_adults, num_children, has_minor, minor_age, notes, total_price,
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
    num_adults: data.num_adults,
    num_children: data.num_children,
    has_minor: data.has_minor,
    minor_age: data.minor_age,
    notes: data.notes,
    total_price: data.total_price != null ? Number(data.total_price) : null,
    room_ids,
    room_names,
  };
}

async function countCereriNoiUncached(): Promise<number> {
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id,
      num_adults, num_children, total_price,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .eq("status", "cerere_noua")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((b) => {
    const br = (b.booking_rooms ?? []) as {
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
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
    };
  });
}

export type OperationalStayRow = BookingRow;

/** Cazări active: cereri noi + confirmate (fără anulate). */
export async function listOperationalStays(): Promise<OperationalStayRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id, total_price,
      num_adults, num_children,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .in("status", ["cerere_noua", "confirmata"])
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((b) => {
    const br = (b.booking_rooms ?? []) as {
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
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
    };
  });
}

export async function confirmBookingWithRooms(
  bookingId: string,
  roomIds: string[],
  totalPrice: number
): Promise<void> {
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw new Error("Prețul total trebuie completat la confirmare");
  }
  const { assertRoomsAssignableForBooking } = await import(
    "@/services/booking-confirm"
  );
  await assertRoomsAssignableForBooking(bookingId, roomIds);

  const supabase = createAdminClient();
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Cererea nu există");
  if (booking.status === "anulata") throw new Error("Cererea e anulată");

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
    throw new Error("Sejurul trebuie să aibă minim o noapte.");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Rezervarea nu există.");
  if (booking.status === "anulata") {
    throw new Error("Nu poți muta o rezervare anulată.");
  }
  if (booking.room_ids.length === 0) {
    throw new Error("Alocă camere înainte de a muta pe calendar.");
  }

  await assertRoomsAvailableForOccupancy(
    newCheckIn,
    newCheckOut,
    booking.room_ids,
    bookingId
  );

  const supabase = createAdminClient();
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
    throw new Error("Ajustare invalidă.");
  }

  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Rezervarea nu există.");
  if (booking.status === "anulata") {
    throw new Error("Nu poți modifica o rezervare anulată.");
  }

  const newCheckOut = addDays(booking.check_out, nightDelta);
  if (!isAtLeastOneNight(booking.check_in, newCheckOut)) {
    throw new Error("Sejurul trebuie să aibă minim o noapte.");
  }

  if (booking.room_ids.length > 0) {
    await rescheduleBookingDates(bookingId, booking.check_in, newCheckOut);
  } else {
    const supabase = createAdminClient();
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
  if (!b) throw new Error("Rezervarea nu există.");
  if (b.status === "anulata") {
    throw new Error("Nu poți duplica o rezervare anulată.");
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
  if (!booking) throw new Error("Rezervarea nu există.");

  const newCheckIn = addDays(booking.check_in, dayDelta);
  const newCheckOut = addDays(booking.check_out, dayDelta);
  await rescheduleBookingDates(bookingId, newCheckIn, newCheckOut);
  return { check_in: newCheckIn, check_out: newCheckOut };
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("Rezervarea nu există");
  if (booking.status === "anulata") {
    throw new Error("Rezervarea este deja anulată");
  }

  const supabase = createAdminClient();
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
