import { mapGuestRowToCheckinInput } from "@/domain/checkin/map-guest-row";
import { bookingRoomNames } from "@/domain/checkin/room-checkin-progress";
import type { CheckinGuestInput } from "@/domain/checkin/types";
import { guestHasProfileData } from "@/domain/guest/profile-data";
import type { GuestRow } from "@/domain/guest/types";
import { getTenantScope } from "@/lib/tenant/scope";
import { getGuestBaseById } from "@/services/guests/lookup";

/** ID-uri client distincte deja legați de check-in-uri pe această rezervare. */
export async function getGuestIdsFromBookingCheckins(
  bookingId: string,
): Promise<string[]> {
  const { tenantId, supabase } = await getTenantScope();

  const { data: checkins, error: checkinErr } = await supabase
    .from("checkins")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);

  if (checkinErr) throw new Error(checkinErr.message);
  if (!checkins?.length) return [];

  const checkinIds = checkins.map((r) => r.id as string);
  const { data: guests, error: guestErr } = await supabase
    .from("checkin_guests")
    .select("guest_id")
    .eq("tenant_id", tenantId)
    .in("checkin_id", checkinIds)
    .not("guest_id", "is", null);

  if (guestErr) throw new Error(guestErr.message);

  const ids = new Set<string>();
  for (const row of guests ?? []) {
    const id = row.guest_id as string | null;
    if (id) ids.add(id);
  }
  return [...ids];
}

async function loadGuestRows(ids: string[]): Promise<GuestRow[]> {
  const rows: GuestRow[] = [];
  for (const id of ids) {
    const guest = await getGuestBaseById(id);
    if (guest && guestHasProfileData(guest)) {
      rows.push(guest);
    }
  }
  return rows;
}

/** Clienți înregistrați cu date — reprezentant + oaspeți deja legați la rezervare. */
export async function listRegisteredGuestsForCheckin(
  bookingId: string,
  bookingGuestId: string | null,
  roomNames: string[] | undefined,
): Promise<CheckinGuestInput[]> {
  const ids = new Set<string>();
  if (bookingGuestId) ids.add(bookingGuestId);

  for (const id of await getGuestIdsFromBookingCheckins(bookingId)) {
    ids.add(id);
  }

  const guestRows = await loadGuestRows([...ids]);
  if (!guestRows.length) return [];

  const rooms = bookingRoomNames(roomNames);
  const defaultRoom = rooms[0] ?? "—";

  return guestRows.map((guest, index) =>
    mapGuestRowToCheckinInput(guest, {
      roomLabel: rooms[index % rooms.length] ?? defaultRoom,
      isRepresentative: bookingGuestId
        ? guest.id === bookingGuestId
        : index === 0,
    }),
  );
}
