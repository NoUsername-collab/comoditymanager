import { todayIso } from "@/lib/stay-dates";
import { loadGuestRebookPanelPayload } from "@/services/guest-rebook";
import {
  findDuplicateGuestsForGuest,
  getGuestBaseById,
  getGuestBookingHistory,
  getGuestById,
} from "@/services/guests";
import { dedupInputFromGuest, findDedupCandidates } from "@/services/guest-dedup";

export async function loadGuestDetailPage(guestId: string) {
  const historyPromise = getGuestBookingHistory(guestId)
    .then((data) => ({ ok: true as const, data }))
    .catch((error: unknown) => ({ ok: false as const, error }));
  const guestResultPromise = getGuestById(guestId).catch(() => null);
  const duplicatesPromise = findDuplicateGuestsForGuest(guestId)
    .then((data) => ({ ok: true as const, data }))
    .catch((error: unknown) => ({ ok: false as const, error }));
  const baseGuestPromise = getGuestBaseById(guestId);
  const dedupCandidatesPromise = guestResultPromise.then((guest) =>
    guest
      ? findDedupCandidates(dedupInputFromGuest(guest)).catch(() => [])
      : baseGuestPromise.then((base) =>
          base
            ? findDedupCandidates(dedupInputFromGuest(base)).catch(() => [])
            : [],
        ),
  );

  const [
    baseGuest,
    guestResult,
    historyResult,
    duplicatesResult,
    dedupCandidates,
    today,
    latestRebookPayload,
  ] = await Promise.all([
    baseGuestPromise,
    guestResultPromise,
    historyPromise,
    duplicatesPromise,
    dedupCandidatesPromise,
    todayIso(),
    historyPromise.then((result) =>
      result.ok && result.data[0]
        ? loadGuestRebookPanelPayload(guestId, result.data[0].id).catch(
            () => null,
          )
        : null,
    ),
  ]);

  if (!baseGuest) return null;

  return {
    baseGuest,
    guestResult,
    historyResult,
    duplicatesResult,
    dedupCandidates,
    today,
    latestRebookPayload,
  };
}
