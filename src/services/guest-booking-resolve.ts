/**
 * Guest lookup/create for new bookings — extracted to break bookings ↔ guests cycle.
 */
import {
  assertValidGuestPhone,
  hasGuestIdentity,
  isPlaceholderEmail,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import { mapGuestRow } from "@/domain/guest/map-row";
import type { GuestBookingInput, GuestRow } from "@/domain/guest/types";
import { getTenantPublicScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivity } from "@/services/activity-log";
import { ensureGuestProfiles } from "@/services/guest-profiles";

async function findGuestByPhone(
  phoneNormalized: string
): Promise<GuestRow | null> {
  const { tenantId, supabase } = await getTenantPublicScope();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function findGuestByEmail(
  emailNormalized: string
): Promise<GuestRow | null> {
  const { tenantId, supabase } = await getTenantPublicScope();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("email_normalized", emailNormalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapGuestRow(data) : null;
}

async function createGuestRecord(input: GuestBookingInput): Promise<string> {
  assertValidGuestPhone(input.guest_phone);

  const emailNorm = normalizeEmail(input.guest_email);
  const phoneNorm = normalizePhone(input.guest_phone);
  const email =
    emailNorm && !isPlaceholderEmail(emailNorm) ? input.guest_email.trim() : null;
  const phone = phoneNorm ? input.guest_phone.trim() : null;

  const { tenantId, supabase } = await getTenantPublicScope();
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
  const { tenantId, supabase } = await getTenantPublicScope();

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
