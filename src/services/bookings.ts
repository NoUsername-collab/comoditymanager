import { createAdminClient } from "@/lib/supabase/admin";
import { isRoomFreeForStay } from "@/domain/availability/rooms-free";
import {
  isAtLeastOneNight,
  rangesOverlap,
} from "@/domain/booking/conflict";
import type { BookingStatus } from "@/domain/booking/types";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { addDays } from "@/lib/stay-dates";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import { getPensionSettings } from "@/services/pension-settings";

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
  num_adults: number;
  num_children: number;
  room_ids: string[];
  room_names: string[];
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
      guest_email, guest_phone,
      num_adults, num_children,
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
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
    };
  });
}

async function pensionCheckTimes(): Promise<{
  checkIn: string;
  checkOut: string;
}> {
  const settings = await getPensionSettings().catch(() => null);
  return {
    checkIn: settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME,
    checkOut: settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME,
  };
}

/** Verifică că camerele sunt libere pe interval (inclusiv alte cereri cu hold). */
export async function assertRoomsAvailableForStay(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  excludeBookingId?: string
): Promise<void> {
  if (!isAtLeastOneNight(checkIn, checkOut)) {
    throw new Error("Sejur invalid.");
  }
  const unique = [...new Set(roomIds.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("Selectează cel puțin o cameră.");
  }

  const times = await pensionCheckTimes();
  const occupied = await listOccupiedRoomRanges(excludeBookingId);

  for (const roomId of unique) {
    if (
      !isRoomFreeForStay(
        roomId,
        checkIn,
        checkOut,
        occupied,
        times.checkIn,
        times.checkOut
      )
    ) {
      throw new Error(
        "Una sau mai multe camere nu mai sunt disponibile. Actualizează datele și alege din nou."
      );
    }
  }
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
      guest_email, guest_phone,
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

export async function countCereriNoi(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "cerere_noua");

  if (error) throw new Error(error.message);
  return count ?? 0;
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
      guest_email, guest_phone,
      num_adults, num_children,
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
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
    };
  });
}

export type OperationalStayRow = BookingRow & {
  total_price: number | null;
};

/** Cazări active: cereri noi + confirmate (fără anulate). */
export async function listOperationalStays(): Promise<OperationalStayRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, total_price,
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
      num_adults: b.num_adults,
      num_children: b.num_children,
      room_ids,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
    };
  });
}

/** Rezervări cu camere alocate pentru verificare suprapunere */
export async function listOccupiedRoomRanges(
  excludeBookingId?: string
): Promise<{ room_id: string; check_in: string; check_out: string }[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("booking_rooms")
    .select(
      `
      room_id,
      bookings!inner ( id, check_in, check_out, status )
    `
    )
    .neq("bookings.status", "anulata");

  if (error) throw new Error(error.message);

  const rows: { room_id: string; check_in: string; check_out: string }[] = [];
  for (const line of data ?? []) {
    const raw = line.bookings as
      | { id: string; check_in: string; check_out: string; status: string }
      | { id: string; check_in: string; check_out: string; status: string }[]
      | null;
    const b = Array.isArray(raw) ? raw[0] : raw;
    if (!b) continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    rows.push({
      room_id: line.room_id,
      check_in: b.check_in,
      check_out: b.check_out,
    });
  }
  return rows;
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

  const occupied = await listOccupiedRoomRanges(bookingId);
  const proposed = { checkIn: newCheckIn, checkOut: newCheckOut };
  for (const stay of occupied) {
    if (!booking.room_ids.includes(stay.room_id)) continue;
    if (
      rangesOverlap(proposed, {
        checkIn: stay.check_in,
        checkOut: stay.check_out,
      })
    ) {
      throw new Error(
        "Conflict: una dintre camere e deja rezervată în perioada aleasă."
      );
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      check_in: newCheckIn,
      check_out: newCheckOut,
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

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
