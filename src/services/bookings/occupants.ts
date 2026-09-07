import { occupantCheckinSlots } from "@/domain/booking/occupants";
import type {
  BookingOccupantDraft,
  BookingOccupantRow,
} from "@/domain/booking/occupants";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { resolveGuestForBooking } from "@/services/guest-booking-resolve";
import { getRoomsByIds } from "@/services/rooms-admin";

export type { BookingOccupantDraft, BookingOccupantRow };

export async function saveBookingOccupants(
  bookingId: string,
  titularGuestId: string | null,
  occupants: BookingOccupantDraft[]
): Promise<void> {
  if (occupants.length === 0) return;

  const { tenantId, supabase } = await getTenantScope();
  const rows: Array<{
    booking_id: string;
    room_id: string;
    guest_id: string;
    is_representative: boolean;
  }> = [];

  for (const [index, occupant] of occupants.entries()) {
    const isRepresentative = index === 0 || occupant.isRepresentative;
    let guestId =
      isRepresentative && titularGuestId ? titularGuestId : null;
    if (!guestId) {
      const resolved = await resolveGuestForBooking({
        guest_name: `${occupant.guestLastName} ${occupant.guestFirstName}`.trim(),
        guest_last_name: occupant.guestLastName,
        guest_first_name: occupant.guestFirstName,
        guest_email: occupant.guestEmail,
        guest_phone: occupant.guestPhone,
      });
      guestId = resolved.guestId;
    }
    if (!guestId) continue;
    rows.push({
      booking_id: bookingId,
      room_id: occupant.roomId,
      guest_id: guestId,
      is_representative: isRepresentative,
    });
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("booking_occupants").insert(
    rows.map((row) => withTenantId(tenantId, row))
  );
  if (error) throw new Error(error.message);
}

export async function listBookingOccupants(
  bookingId: string
): Promise<BookingOccupantRow[]> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("booking_occupants")
    .select("room_id, guest_id, is_representative")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .order("is_representative", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    roomId: String(row.room_id),
    guestId: String(row.guest_id),
    isRepresentative: Boolean(row.is_representative),
  }));
}

export async function occupantSlotsForCheckin(bookingId: string) {
  const occupants = await listBookingOccupants(bookingId);
  if (occupants.length === 0) return [];
  const rooms = await getRoomsByIds(occupants.map((row) => row.roomId));
  return occupantCheckinSlots(occupants, rooms);
}
