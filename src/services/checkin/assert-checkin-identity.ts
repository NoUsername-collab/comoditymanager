import { guestsCollectingIdentity } from "@/domain/checkin/guest-layout";
import {
  findDuplicateNationalIdsInForm,
  guestNationalIdKey,
  holderNationalIdMatches,
} from "@/domain/checkin/identity-guards";
import { guestFullName } from "@/domain/checkin/identity-rules";
import type { BookingForCheckin, CheckinGuestInput } from "@/domain/checkin/types";
import { getGuestBaseById, findGuestByNationalId } from "@/services/guests/lookup";

/**
 * Blochează check-in când identitatea introdusă nu poate fi legată în siguranță
 * de profilul clientului (ex.: CNP al altui client pe titularul rezervării).
 */
export async function assertCheckinIdentityIntegrity(
  guests: CheckinGuestInput[],
  booking: BookingForCheckin,
): Promise<string[]> {
  const activeGuests = guestsCollectingIdentity(guests);
  const blockers = findDuplicateNationalIdsInForm(activeGuests);

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
        blockers.push(
          `CNP/codul introdus pentru titular aparține clientului „${existing.display_name}”, dar rezervarea este pe „${booking.guest_name}”. Nu introduceți datele altcuiva la titular — adăugați persoana ca oaspet sau deschideți rezervarea corectă.`,
        );
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

  return blockers;
}
