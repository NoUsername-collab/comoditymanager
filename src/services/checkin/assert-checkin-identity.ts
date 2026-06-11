import { guestsCollectingIdentity } from "@/domain/checkin/guest-layout";
import {
  findDuplicateNationalIdsInForm,
  guestNationalIdKey,
  holderNationalIdMatches,
} from "@/domain/checkin/identity-guards";
import type { CheckinIdentityResult } from "@/domain/checkin/identity-result";
import { guestFullName } from "@/domain/checkin/identity-rules";
import type { BookingForCheckin, CheckinGuestInput } from "@/domain/checkin/types";
import { getGuestBaseById, findGuestByNationalId } from "@/services/guests/lookup";

/**
 * Verifică identitatea la check-in. Când CNP-ul titularului aparține altui client,
 * oferă mutarea rezervării în loc de blocare secă.
 */
export async function assertCheckinIdentityIntegrity(
  guests: CheckinGuestInput[],
  booking: BookingForCheckin,
): Promise<CheckinIdentityResult> {
  const activeGuests = guestsCollectingIdentity(guests);
  const blockers = findDuplicateNationalIdsInForm(activeGuests);
  let transferOffer: CheckinIdentityResult["transferOffer"];

  for (const guest of activeGuests) {
    const nationalKey = guestNationalIdKey(guest);
    if (!nationalKey) continue;

    const existing = await findGuestByNationalId(
      nationalKey,
      guest.guest_id ?? undefined,
    );

    if (existing) {
      if (
        guest.is_representative &&
        booking.guest_id &&
        existing.id !== booking.guest_id
      ) {
        transferOffer = {
          existingGuestId: existing.id,
          existingGuestName: existing.display_name,
          bookingGuestName: booking.guest_name,
        };
        continue;
      }

      if (guest.guest_id && existing.id !== guest.guest_id) {
        blockers.push(
          `CNP/codul personal este deja înregistrat pentru clientul „${existing.display_name}” (${guestFullName(guest) || "oaspete"}).`,
        );
      }
      continue;
    }

    if (guest.is_representative && booking.guest_id) {
      const holder = await getGuestBaseById(booking.guest_id);
      const holderHasIdentity = Boolean(
        holder?.national_id?.trim() || holder?.cnp?.trim(),
      );
      if (
        holderHasIdentity &&
        !holderNationalIdMatches(
          nationalKey,
          holder?.national_id,
          holder?.cnp,
        )
      ) {
        blockers.push(
          `CNP/codul introdus nu corespunde titularului rezervării „${booking.guest_name}”. Verificați datele sau adăugați oaspetul ca persoană separată.`,
        );
      }
    }
  }

  return { blockers, transferOffer };
}
