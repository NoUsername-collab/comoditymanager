/**
 * Guest lookup/create for new bookings — extracted to break bookings ↔ guests cycle.
 */
import { after } from "next/server";
import {
  hasGuestIdentity,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import type { GuestBookingInput } from "@/domain/guest/types";
import { getTenantScope } from "@/lib/tenant/scope";
import { logAdminActivity } from "@/services/activity-log";
import {
  createGuestFromContact,
  matchGuestByContact,
  touchGuestContactFields,
} from "@/services/guests/match-guest";

async function createGuestRecord(input: GuestBookingInput): Promise<string> {
  return createGuestFromContact({
    lastName: input.guest_last_name,
    firstName: input.guest_first_name,
    phone: input.guest_phone,
    email: input.guest_email,
  });
}

export type ResolveGuestResult = {
  guestId: string | null;
  mergeConflict: boolean;
};

export async function resolveGuestForBooking(
  input: GuestBookingInput
): Promise<ResolveGuestResult> {
  if (!hasGuestIdentity(input)) {
    return { guestId: null, mergeConflict: false };
  }

  const last = input.guest_last_name.trim();
  const first = input.guest_first_name.trim();
  const match = await matchGuestByContact({
    lastName: last,
    firstName: first,
    phone: input.guest_phone,
    email: input.guest_email,
  });

  if (match.status === "matched") {
    await touchGuestContactFields(match.guestId, {
      lastName: last,
      firstName: first,
      phone: input.guest_phone,
      email: input.guest_email,
    });
    return { guestId: match.guestId, mergeConflict: false };
  }

  if (match.status === "ambiguous") {
    const phoneNorm = normalizePhone(input.guest_phone);
    if (phoneNorm) {
      const { tenantId, supabase } = await getTenantScope();
      const { data } = await supabase
        .from("guests")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_normalized", phoneNorm)
        .maybeSingle();
      if (data?.id) {
        await touchGuestContactFields(String(data.id), {
          lastName: last,
          firstName: first,
          phone: input.guest_phone,
          email: input.guest_email,
        });
        return { guestId: String(data.id), mergeConflict: true };
      }
    }
    return { guestId: null, mergeConflict: true };
  }

  const guestId = await createGuestRecord(input);
  const guestName = input.guest_name.trim();
  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  after(async () => {
    await logAdminActivity({
      action: "guest.created",
      entityType: "guest",
      entityId: guestId,
      summary: `Client nou: ${guestName}`,
      metadata: {
        email: emailNorm,
        phone: phoneNorm,
      },
      actor: null,
    });
  });

  return { guestId, mergeConflict: false };
}
