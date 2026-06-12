import { checkinUiDocTypeValue } from "@/domain/checkin/doc-type";
import { guestFullName } from "@/domain/checkin/identity-rules";
import type { CheckinGuestInput, BookingForCheckin } from "@/domain/checkin/types";
import { mergeGuestIdentityPatch } from "@/domain/guest/identity-merge";
import type { GuestDocType, GuestSex } from "@/domain/guest/types";
import {
  cleanNationalId,
  extractIdentityFromNationalId,
  type NationalIdType,
} from "@/domain/guest/national-id";
import { getGuestBaseById } from "@/services/guests/lookup";
import {
  createGuestFromContact,
  resolveGuestIdForIdentity,
  touchGuestContactFields,
} from "@/services/guests/match-guest";
import {
  updateGuestIdentity,
  updateGuestPhone,
  type GuestIdentityInput,
} from "@/services/guests/profile";

function mapCheckinGuestToIdentityPatch(
  guest: CheckinGuestInput,
): GuestIdentityInput {
  const docType = checkinUiDocTypeValue(guest.document_type) as GuestDocType | "";
  const nationalIdType = (guest.national_id_type ?? "cnp") as NationalIdType;
  const nationalId = guest.national_id?.trim()
    ? cleanNationalId(guest.national_id)
    : null;

  let birthDate = guest.birth_date ?? null;
  let sex: GuestSex | null = null;
  const extracted = nationalId
    ? extractIdentityFromNationalId(nationalIdType, nationalId)
    : null;
  if (extracted?.birthDate) birthDate = extracted.birthDate;
  if (extracted?.sex) sex = extracted.sex;

  return {
    doc_type: docType || null,
    doc_series: guest.document_series ?? null,
    doc_number: guest.document_number ?? null,
    doc_issued_by: null,
    doc_issue_date: null,
    doc_expiry_date: guest.doc_expiry_date?.trim() || null,
    national_id_type: guest.national_id_type ?? null,
    national_id: nationalId,
    cnp: guest.national_id_type === "cnp" ? nationalId : null,
    birth_date: birthDate,
    birth_place: null,
    nationality: guest.nationality ?? null,
    address: null,
    city: null,
    county: null,
    country: guest.nationality ?? null,
    sex,
  };
}

function contactEmailForGuest(
  guest: CheckinGuestInput,
  booking: BookingForCheckin,
): string | null {
  if (guest.is_representative) return booking.guest_email;
  return null;
}

async function resolveOrCreateGuestId(
  guest: CheckinGuestInput,
  booking: BookingForCheckin,
): Promise<string | null> {
  const resolved = await resolveGuestIdForIdentity({
    guestId: guest.guest_id,
    nationalId: guest.national_id,
    lastName: guest.last_name,
    firstName: guest.first_name,
    phone: guest.phone,
    email: contactEmailForGuest(guest, booking),
    bookingGuestId: booking.guest_id,
    isRepresentative: guest.is_representative,
  });

  if (resolved.status === "ambiguous") {
    throw new Error(`checkin.blocked: ${resolved.message}`);
  }

  if (resolved.status === "matched") {
    return resolved.guestId;
  }

  const last = guest.last_name?.trim() ?? "";
  const first = guest.first_name?.trim() ?? "";
  if (last.length < 1 || first.length < 1) {
    return null;
  }

  return createGuestFromContact({
    lastName: last,
    firstName: first,
    phone: guest.phone,
    email: contactEmailForGuest(guest, booking),
  });
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
    const guestId = await resolveOrCreateGuestId(guest, booking);
    if (!guestId) {
      synced.push(guest);
      continue;
    }

    const current = await getGuestBaseById(guestId);
    const patch = mapCheckinGuestToIdentityPatch(guest);
    const identity = current
      ? mergeGuestIdentityPatch(current, patch)
      : patch;

    const { identityStatus } = await updateGuestIdentity(guestId, identity);

    await touchGuestContactFields(guestId, {
      lastName: guest.last_name,
      firstName: guest.first_name,
      phone: guest.phone,
      email: contactEmailForGuest(guest, booking),
    });

    if (guest.phone?.trim()) {
      try {
        await updateGuestPhone(guestId, guest.phone.trim());
      } catch {
        // Telefon invalid — restul identității e salvat
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
