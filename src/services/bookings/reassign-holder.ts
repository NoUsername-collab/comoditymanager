import { getTenantScope } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getGuestBaseById } from "@/services/guests/lookup";
import { resolveGuestAlertSnapshot } from "@/services/guest-profiles";
import { getBookingById } from "./queries";

/**
 * Mută titularul rezervării pe un profil client existent (ex. la check-in
 * când CNP-ul introdus aparține altui client).
 */
export async function reassignBookingHolder(
  bookingId: string,
  targetGuestId: string,
): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");

  const guest = await getGuestBaseById(targetGuestId);
  if (!guest) throw new Error("guest.not_found");

  const guestAlert = await resolveGuestAlertSnapshot({
    guestId: guest.id,
    guestLastName: guest.last_name,
    guestFirstName: guest.first_name,
  });

  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("bookings")
    .update({
      guest_id: guest.id,
      guest_name: guest.display_name,
      guest_last_name: guest.last_name,
      guest_first_name: guest.first_name,
      guest_email: guest.email ?? booking.guest_email,
      guest_phone: guest.phone ?? booking.guest_phone,
      guest_alert_level: guestAlert.level,
      guest_alert_note: guestAlert.note,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.holder_reassigned",
    entityType: "booking",
    entityId: bookingId,
    summary: `Titular mutat: ${booking.guest_name} → ${guest.display_name}`,
    metadata: {
      from_guest_id: booking.guest_id,
      to_guest_id: guest.id,
    },
  });
}
