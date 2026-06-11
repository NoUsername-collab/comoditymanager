/**
 * Guest lookup/create for new bookings — extracted to break bookings ↔ guests cycle.
 */
import { after } from "next/server";
import {
  assertValidGuestPhone,
  hasGuestIdentity,
  isPlaceholderEmail,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import type { GuestBookingInput } from "@/domain/guest/types";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivity } from "@/services/activity-log";
import { ensureGuestProfiles } from "@/services/guest-profiles";
import { findGuestByNameParts } from "@/services/guests/lookup";

async function findGuestIdByPhone(
  phoneNormalized: string,
): Promise<string | null> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : null;
}

async function findGuestIdByEmail(
  emailNormalized: string,
): Promise<string | null> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email_normalized", emailNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : null;
}

async function createGuestRecord(input: GuestBookingInput): Promise<string> {
  assertValidGuestPhone(input.guest_phone);

  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const email =
    emailNorm && !isPlaceholderEmail(emailNorm) ? input.guest_email.trim() : null;
  const phone = phoneNorm ? input.guest_phone.trim() : null;

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .insert(
      withTenantId(tenantId, {
        last_name: input.guest_last_name.trim(),
        first_name: input.guest_first_name.trim(),
        display_name: input.guest_name.trim(),
        email,
        email_normalized:
          emailNorm && !isPlaceholderEmail(emailNorm) ? emailNorm : null,
        phone,
        phone_normalized: phoneNorm,
      })
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await ensureGuestProfiles([data.id]);
  return data.id;
}

async function touchGuestFromBooking(
  guestId: string,
  input: GuestBookingInput
): Promise<void> {
  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const { tenantId, supabase } = await getTenantScope();

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

  const { error } = await supabase
    .from("guests")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", guestId);
  if (error) throw new Error(error.message);
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

  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const last = input.guest_last_name.trim();
  const first = input.guest_first_name.trim();

  const [phoneGuestId, emailGuestId, byName] = await Promise.all([
    phoneNorm ? findGuestIdByPhone(phoneNorm) : Promise.resolve(null),
    emailNorm && !isPlaceholderEmail(emailNorm)
      ? findGuestIdByEmail(emailNorm)
      : Promise.resolve(null),
    last.length >= 2 && first.length >= 2
      ? findGuestByNameParts(last, first)
      : Promise.resolve(null),
  ]);

  if (phoneGuestId && emailGuestId && phoneGuestId !== emailGuestId) {
    await touchGuestFromBooking(phoneGuestId, input);
    return { guestId: phoneGuestId, mergeConflict: true };
  }

  if (phoneGuestId) {
    await touchGuestFromBooking(phoneGuestId, input);
    return { guestId: phoneGuestId, mergeConflict: false };
  }

  if (emailGuestId) {
    await touchGuestFromBooking(emailGuestId, input);
    return { guestId: emailGuestId, mergeConflict: false };
  }

  if (byName) {
    await touchGuestFromBooking(byName.id, input);
    return { guestId: byName.id, mergeConflict: false };
  }

  const guestId = await createGuestRecord(input);
  const guestName = input.guest_name.trim();
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
