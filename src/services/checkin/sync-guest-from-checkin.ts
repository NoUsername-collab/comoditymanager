import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import { guestFullName } from "@/domain/checkin/identity-rules";
import type { CheckinGuestInput, BookingForCheckin } from "@/domain/checkin/types";
import type { GuestDocType } from "@/domain/guest/types";
import { cleanNationalId } from "@/domain/guest/national-id";
import { findGuestByNationalId } from "@/services/guests/lookup";
import {
  updateGuestIdentity,
  updateGuestPhone,
  type GuestIdentityInput,
} from "@/services/guests/profile";
import { normalizePhone } from "@/domain/guest/normalize";
import { getTenantScope } from "@/lib/tenant/scope";

function mapCheckinGuestToIdentityInput(
  guest: CheckinGuestInput,
): GuestIdentityInput {
  const docType = checkinUiDocTypeValue(guest.document_type) as GuestDocType | "";
  const nationalId = guest.national_id?.trim()
    ? cleanNationalId(guest.national_id)
    : null;

  return {
    doc_type: docType || null,
    doc_series: guest.document_series ?? null,
    doc_number: guest.document_number ?? null,
    doc_issued_by: null,
    doc_issue_date: null,
    doc_expiry_date: null,
    national_id_type: guest.national_id_type ?? null,
    national_id: nationalId,
    cnp: guest.national_id_type === "cnp" ? nationalId : null,
    birth_date: guest.birth_date ?? null,
    birth_place: null,
    nationality: guest.nationality ?? null,
    address: null,
    city: null,
    county: null,
    country: guest.nationality ?? null,
    sex: null,
  };
}

async function findGuestIdByPhone(phone: string): Promise<string | null> {
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return null;
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_normalized", phoneNorm)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}

async function resolveGuestId(
  guest: CheckinGuestInput,
  booking: BookingForCheckin,
): Promise<string | null> {
  if (guest.guest_id) return guest.guest_id;

  const nationalId = guest.national_id?.trim();
  if (nationalId) {
    const match = await findGuestByNationalId(nationalId);
    if (match) return match.id;
  }

  if (guest.is_representative && booking.guest_id) {
    return booking.guest_id;
  }

  const phone = guest.phone?.trim();
  if (phone) {
    return findGuestIdByPhone(phone);
  }

  return null;
}

/**
 * Scrie datele din check-in în profilul clientului (`guests`).
 * Returnează oaspeții cu `guest_id` rezolvat pentru persistență.
 */
export async function syncCheckinGuestsToClientProfiles(
  guests: CheckinGuestInput[],
  booking: BookingForCheckin,
): Promise<CheckinGuestInput[]> {
  const synced: CheckinGuestInput[] = [];

  for (const guest of guests) {
    const guestId = await resolveGuestId(guest, booking);
    if (!guestId) {
      synced.push(guest);
      continue;
    }

    const identity = mapCheckinGuestToIdentityInput(guest);
    const { identityStatus } = await updateGuestIdentity(guestId, identity);

    if (guest.phone?.trim()) {
      try {
        await updateGuestPhone(guestId, guest.phone.trim());
      } catch {
        // Telefon invalid — identitatea principală e deja salvată
      }
    }

    synced.push({
      ...guest,
      guest_id: guestId,
      identity_status: identityStatus,
      full_name: guestFullName(guest) || guest.full_name,
    });
  }

  return synced;
}
