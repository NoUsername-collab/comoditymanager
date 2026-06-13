import {
  buildGuestPrecheckinPrefill,
  type GuestPrecheckinPrefill,
  type GuestPrecheckinPrefillGuest,
} from "@/domain/guest-app/precheckin-prefill";
import type { GuestAccessBookingSnapshot } from "@/domain/guest-app/types";
import { mapGuestRow } from "@/domain/guest/map-row";
import { getGuestAppPublicDb } from "@/services/guest-app/public-db";

function mapGuestRowToPrefillGuest(
  row: ReturnType<typeof mapGuestRow>,
): GuestPrecheckinPrefillGuest {
  return {
    lastName: row.last_name,
    firstName: row.first_name,
    phone: row.phone,
    email: row.email,
    docType: row.doc_type,
    docNumber: row.doc_number,
    nationalId: row.national_id ?? row.cnp,
    nationalIdType: row.national_id_type ?? "cnp",
    birthDate: row.birth_date,
    nationality: row.nationality,
  };
}

async function loadBookingGuestId(bookingId: string): Promise<{
  guestId: string | null;
  guestLastName: string | null;
  guestFirstName: string | null;
}> {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  const { data, error } = await supabase
    .from("bookings")
    .select("guest_id, guest_last_name, guest_first_name")
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    return { guestId: null, guestLastName: null, guestFirstName: null };
  }

  return {
    guestId: data.guest_id ? String(data.guest_id) : null,
    guestLastName: data.guest_last_name ? String(data.guest_last_name) : null,
    guestFirstName: data.guest_first_name ? String(data.guest_first_name) : null,
  };
}

async function loadGuestForPrefill(guestId: string): Promise<GuestPrecheckinPrefillGuest | null> {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", guestId)
    .maybeSingle();

  if (error || !data) return null;
  return mapGuestRowToPrefillGuest(mapGuestRow(data));
}

export async function loadGuestPrecheckinPrefill(
  booking: GuestAccessBookingSnapshot,
): Promise<GuestPrecheckinPrefill> {
  const bookingMeta = await loadBookingGuestId(booking.id);
  const guest =
    bookingMeta.guestId != null
      ? await loadGuestForPrefill(bookingMeta.guestId)
      : null;

  return buildGuestPrecheckinPrefill({
    booking: {
      guestName: booking.guestName,
      guestLastName: bookingMeta.guestLastName,
      guestFirstName: bookingMeta.guestFirstName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
    },
    guest,
  });
}
