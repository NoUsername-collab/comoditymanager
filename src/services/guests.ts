import { formatGuestFullName } from "@/domain/guest-name";
import { shiftStayDatesByYears } from "@/domain/guest/rebook-dates";
import {
  hasGuestIdentity,
  isPlaceholderEmail,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import { parseGuestTags } from "@/domain/guest/tags";
import type {
  GuestBookingInput,
  GuestListItem,
  GuestRow,
  GuestTag,
} from "@/domain/guest/types";
import type { BookingStatus } from "@/domain/booking/types";
import type { BookingRoomSegmentRow } from "@/domain/booking/segment-types";
import { stayNightCount } from "@/lib/stay-dates";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import { listSegmentsForBooking } from "@/services/booking-segments";
import {
  assertRoomsAvailableForStay,
  createBookingRequest,
  getBookingById,
} from "@/services/bookings";

function mapGuestRow(row: Record<string, unknown>): GuestRow {
  return {
    id: String(row.id),
    last_name: String(row.last_name ?? ""),
    first_name: String(row.first_name ?? ""),
    display_name: String(row.display_name ?? ""),
    phone: row.phone != null ? String(row.phone) : null,
    phone_normalized:
      row.phone_normalized != null ? String(row.phone_normalized) : null,
    email: row.email != null ? String(row.email) : null,
    email_normalized:
      row.email_normalized != null ? String(row.email_normalized) : null,
    notes: row.notes != null ? String(row.notes) : null,
    tags: parseGuestTags(row.tags),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function findGuestByPhone(
  phoneNormalized: string
): Promise<GuestRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function findGuestByEmail(
  emailNormalized: string
): Promise<GuestRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("email_normalized", emailNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function createGuestRecord(input: GuestBookingInput): Promise<string> {
  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const email =
    emailNorm && !isPlaceholderEmail(emailNorm) ? input.guest_email.trim() : null;
  const phone = phoneNorm ? input.guest_phone.trim() : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .insert({
      last_name: input.guest_last_name.trim(),
      first_name: input.guest_first_name.trim(),
      display_name: input.guest_name.trim(),
      email,
      email_normalized:
        emailNorm && !isPlaceholderEmail(emailNorm) ? emailNorm : null,
      phone,
      phone_normalized: phoneNorm,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function touchGuestFromBooking(
  guestId: string,
  input: GuestBookingInput
): Promise<void> {
  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {
    last_name: input.guest_last_name.trim(),
    first_name: input.guest_first_name.trim(),
    display_name: input.guest_name.trim(),
  };

  if (phoneNorm) {
    patch.phone = input.guest_phone.trim();
    patch.phone_normalized = phoneNorm;
  }
  if (emailNorm && !isPlaceholderEmail(emailNorm)) {
    patch.email = input.guest_email.trim();
    patch.email_normalized = emailNorm;
  }

  const { error } = await supabase.from("guests").update(patch).eq("id", guestId);
  if (error) throw new Error(error.message);
}

export type ResolveGuestResult = {
  guestId: string | null;
  mergeConflict: boolean;
};

/** Matching: telefon → email → guest nou. Conflict = telefon ≠ email match. */
export async function resolveGuestForBooking(
  input: GuestBookingInput
): Promise<ResolveGuestResult> {
  if (!hasGuestIdentity(input)) {
    return { guestId: null, mergeConflict: false };
  }

  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const byPhone = phoneNorm ? await findGuestByPhone(phoneNorm) : null;
  const byEmail =
    emailNorm && !isPlaceholderEmail(emailNorm)
      ? await findGuestByEmail(emailNorm)
      : null;

  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    await touchGuestFromBooking(byPhone.id, input);
    return { guestId: byPhone.id, mergeConflict: true };
  }

  if (byPhone) {
    await touchGuestFromBooking(byPhone.id, input);
    return { guestId: byPhone.id, mergeConflict: false };
  }

  if (byEmail) {
    await touchGuestFromBooking(byEmail.id, input);
    return { guestId: byEmail.id, mergeConflict: false };
  }

  const guestId = await createGuestRecord(input);
  await logAdminActivity({
    action: "guest.created",
    entityType: "guest",
    entityId: guestId,
    summary: `Client nou: ${input.guest_name.trim()}`,
    metadata: {
      email: emailNorm,
      phone: phoneNorm,
    },
    actor: null,
  });

  return { guestId, mergeConflict: false };
}

export async function getGuestById(id: string): Promise<GuestRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

export async function listGuests(query?: string): Promise<GuestListItem[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("guests")
    .select("id, display_name, phone, email, tags, created_at, updated_at")
    .order("display_name", { ascending: true })
    .limit(200);

  const term = query?.trim();
  if (term) {
    const like = `%${term.replace(/[%_]/g, "")}%`;
    q = q.or(
      `display_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`
    );
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const guests = data ?? [];
  if (guests.length === 0) return [];

  const ids = guests.map((g) => g.id as string);
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("guest_id, check_out, status")
    .in("guest_id", ids)
    .neq("status", "anulata");
  if (bErr) throw new Error(bErr.message);

  const stats = new Map<
    string,
    { count: number; lastCheckOut: string | null }
  >();
  for (const b of bookings ?? []) {
    const gid = b.guest_id as string;
    const cur = stats.get(gid) ?? { count: 0, lastCheckOut: null };
    cur.count += 1;
    const co = b.check_out as string;
    if (!cur.lastCheckOut || co > cur.lastCheckOut) {
      cur.lastCheckOut = co;
    }
    stats.set(gid, cur);
  }

  return guests.map((g) => {
    const s = stats.get(g.id as string);
    return {
      id: g.id as string,
      display_name: g.display_name as string,
      phone: g.phone as string | null,
      email: g.email as string | null,
      tags: parseGuestTags(g.tags),
      created_at: g.created_at as string,
      updated_at: g.updated_at as string,
      booking_count: s?.count ?? 0,
      last_stay_check_out: s?.lastCheckOut ?? null,
    };
  });
}

export type GuestBookingHistoryItem = {
  id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  room_names: string[];
  total_price: number | null;
  num_adults: number;
  num_children: number;
  segments: BookingRoomSegmentRow[];
};

export async function getGuestBookingHistory(
  guestId: string
): Promise<GuestBookingHistoryItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, total_price, num_adults, num_children,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .eq("guest_id", guestId)
    .order("check_in", { ascending: false });

  if (error) throw new Error(error.message);

  const items: GuestBookingHistoryItem[] = [];
  for (const b of data ?? []) {
    const br = (b.booking_rooms ?? []) as {
      room_id: string;
      rooms: { name: string } | { name: string }[] | null;
    }[];
    const room_names: string[] = [];
    for (const line of br) {
      const r = line.rooms;
      const name = Array.isArray(r) ? r[0]?.name : r?.name;
      if (name) room_names.push(name);
    }
    const segments = await listSegmentsForBooking(b.id as string);
    items.push({
      id: b.id as string,
      check_in: b.check_in as string,
      check_out: b.check_out as string,
      status: b.status as BookingStatus,
      room_names,
      total_price: b.total_price != null ? Number(b.total_price) : null,
      num_adults: b.num_adults as number,
      num_children: b.num_children as number,
      segments,
    });
  }
  return items;
}

export async function updateGuestNotes(
  guestId: string,
  notes: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guests")
    .update({ notes: notes.trim() || null })
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  await logAdminActivityFromSession({
    action: "guest.updated",
    entityType: "guest",
    entityId: guestId,
    summary: "Note client actualizate",
    metadata: {},
  });
}

export async function updateGuestTags(
  guestId: string,
  tags: GuestTag[]
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("guests")
    .update({ tags })
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  await logAdminActivityFromSession({
    action: "guest.updated",
    entityType: "guest",
    entityId: guestId,
    summary: "Etichete client actualizate",
    metadata: { tags },
  });
}

export async function mergeGuests(
  sourceId: string,
  targetId: string
): Promise<void> {
  if (sourceId === targetId) {
    throw new Error("Alege un client diferit pentru combinare.");
  }

  const supabase = createAdminClient();
  const [source, target] = await Promise.all([
    getGuestById(sourceId),
    getGuestById(targetId),
  ]);
  if (!source || !target) throw new Error("Clientul nu există.");

  const { error: moveErr } = await supabase
    .from("bookings")
    .update({ guest_id: targetId })
    .eq("guest_id", sourceId);
  if (moveErr) throw new Error(moveErr.message);

  const mergedTags = [...new Set([...target.tags, ...source.tags])];
  const mergedNotes = [target.notes, source.notes]
    .filter(Boolean)
    .join("\n---\n");

  const patch: Record<string, unknown> = {
    tags: mergedTags,
    notes: mergedNotes || null,
  };
  if (!target.phone && source.phone) {
    patch.phone = source.phone;
    patch.phone_normalized = source.phone_normalized;
  }
  if (!target.email && source.email) {
    patch.email = source.email;
    patch.email_normalized = source.email_normalized;
  }

  const { error: updErr } = await supabase
    .from("guests")
    .update(patch)
    .eq("id", targetId);
  if (updErr) throw new Error(updErr.message);

  const { error: delErr } = await supabase
    .from("guests")
    .delete()
    .eq("id", sourceId);
  if (delErr) throw new Error(delErr.message);

  await logAdminActivityFromSession({
    action: "guest.merged",
    entityType: "guest",
    entityId: targetId,
    summary: `Profil combinat: ${source.display_name} → ${target.display_name}`,
    metadata: { source_id: sourceId },
  });
}

async function estimateTotalForRooms(
  checkIn: string,
  checkOut: string,
  roomIds: string[]
): Promise<number | null> {
  if (roomIds.length === 0) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("price_per_night")
    .in("id", roomIds);
  if (error) throw new Error(error.message);
  const nights = stayNightCount(checkIn, checkOut);
  const raw = (data ?? []).reduce(
    (sum, r) => sum + Number(r.price_per_night) * nights,
    0
  );
  return Math.round(raw * 100) / 100;
}

async function getLastGuestBooking(guestId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("guest_id", guestId)
    .neq("status", "anulata")
    .order("check_out", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return getBookingById(data.id);
}

export async function rebookGuestLastStay(guestId: string): Promise<string> {
  const guest = await getGuestById(guestId);
  if (!guest) throw new Error("Clientul nu există.");

  const last = await getLastGuestBooking(guestId);
  if (!last) {
    throw new Error("Nu există un sejur anterior pentru rebook.");
  }

  const roomIds = last.room_ids;
  if (roomIds.length > 0) {
    await assertRoomsAvailableForStay(last.check_in, last.check_out, roomIds);
  }

  const total = await estimateTotalForRooms(
    last.check_in,
    last.check_out,
    roomIds
  );

  const bookingId = await createBookingRequest({
    check_in: last.check_in,
    check_out: last.check_out,
    guest_name: guest.display_name,
    guest_last_name: guest.last_name,
    guest_first_name: guest.first_name,
    guest_email: guest.email ?? last.guest_email,
    guest_phone: guest.phone ?? last.guest_phone ?? "",
    num_adults: last.num_adults,
    num_children: last.num_children,
    has_minor: last.has_minor,
    minor_age: last.minor_age ?? "",
    notes: `[Rebook] Ultimul sejur (${last.check_in} → ${last.check_out})`,
    total_price: total,
    room_ids: roomIds.length > 0 ? roomIds : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook ultimul sejur: ${guest.display_name}`,
    metadata: { guest_id: guestId, source_booking_id: last.id },
  });

  return bookingId;
}

export async function rebookGuestSamePeriodNextYear(
  guestId: string
): Promise<string> {
  const guest = await getGuestById(guestId);
  if (!guest) throw new Error("Clientul nu există.");

  const last = await getLastGuestBooking(guestId);
  if (!last) {
    throw new Error("Nu există un sejur anterior pentru rebook.");
  }

  const shifted = shiftStayDatesByYears(last.check_in, last.check_out, 1);
  const roomIds = last.room_ids;

  if (roomIds.length > 0) {
    await assertRoomsAvailableForStay(
      shifted.check_in,
      shifted.check_out,
      roomIds
    );
  }

  const total = await estimateTotalForRooms(
    shifted.check_in,
    shifted.check_out,
    roomIds
  );

  const bookingId = await createBookingRequest({
    check_in: shifted.check_in,
    check_out: shifted.check_out,
    guest_name: guest.display_name,
    guest_last_name: guest.last_name,
    guest_first_name: guest.first_name,
    guest_email: guest.email ?? last.guest_email,
    guest_phone: guest.phone ?? last.guest_phone ?? "",
    num_adults: last.num_adults,
    num_children: last.num_children,
    has_minor: last.has_minor,
    minor_age: last.minor_age ?? "",
    notes: `[Rebook] Aceeași perioadă an viitor (din ${last.check_in})`,
    total_price: total,
    room_ids: roomIds.length > 0 ? roomIds : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook an viitor: ${guest.display_name}`,
    metadata: {
      guest_id: guestId,
      source_booking_id: last.id,
      check_in: shifted.check_in,
      check_out: shifted.check_out,
    },
  });

  return bookingId;
}

export async function findDuplicateGuestsForGuest(
  guestId: string
): Promise<GuestListItem[]> {
  const guest = await getGuestById(guestId);
  if (!guest) return [];

  const supabase = createAdminClient();
  const orParts: string[] = [];
  if (guest.phone_normalized) {
    orParts.push(`phone_normalized.eq.${guest.phone_normalized}`);
  }
  if (guest.email_normalized) {
    orParts.push(`email_normalized.eq.${guest.email_normalized}`);
  }
  if (orParts.length === 0) return [];

  const { data, error } = await supabase
    .from("guests")
    .select("id, display_name, phone, email, tags, created_at, updated_at")
    .or(orParts.join(","))
    .neq("id", guestId);
  if (error) throw new Error(error.message);

  return (data ?? []).map((g) => ({
    id: g.id as string,
    display_name: g.display_name as string,
    phone: g.phone as string | null,
    email: g.email as string | null,
    tags: parseGuestTags(g.tags),
    created_at: g.created_at as string,
    updated_at: g.updated_at as string,
    booking_count: 0,
    last_stay_check_out: null,
  }));
}

export function guestInputFromNames(
  lastName: string,
  firstName: string,
  email: string,
  phone: string
): GuestBookingInput {
  return {
    guest_last_name: lastName,
    guest_first_name: firstName,
    guest_name: formatGuestFullName(lastName, firstName),
    guest_email: email,
    guest_phone: phone,
  };
}
