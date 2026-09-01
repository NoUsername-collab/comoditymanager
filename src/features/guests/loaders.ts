import { todayIso } from "@/lib/stay-dates";
import { loadGuestRebookPanelPayload } from "@/services/guest-rebook";
import {
  findDuplicateGuestsForGuest,
  getGuestBaseById,
  getGuestBookingHistory,
  getGuestById,
  listGuestHighlights,
  searchGuests,
} from "@/services/guests";
import { dedupInputFromGuest, findDedupCandidates } from "@/services/guest-dedup";

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizePage(value: string): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export async function loadGuestsListPage(sp: {
  q?: string;
  filter?: string;
  page?: string;
  selected?: string;
}) {
  const q = firstValue(sp.q);
  const filter = firstValue(sp.filter);
  const page = normalizePage(firstValue(sp.page));
  const selected = firstValue(sp.selected);
  const hasSearchCriteria =
    q.length > 0 || (filter && filter !== "all" && filter !== "");

  try {
    const [searchResult, highlightsResult, selectedResult] = await Promise.all([
      searchGuests({ query: q, filter, page, pageSize: 20 }),
      hasSearchCriteria
        ? Promise.resolve(null)
        : listGuestHighlights().catch(() => null),
      selected ? getGuestById(selected).catch(() => null) : Promise.resolve(null),
    ]);
    return {
      ok: true as const,
      q,
      filter,
      page,
      selected,
      result: searchResult,
      highlights: searchResult.mode === "highlights" ? highlightsResult : null,
      selectedGuest: selectedResult,
    };
  } catch (e) {
    const selectedGuest = selected
      ? await getGuestById(selected).catch(() => null)
      : null;
    return {
      ok: false as const,
      q,
      filter,
      page,
      selected,
      error: e instanceof Error ? e.message : "generic",
      selectedGuest,
    };
  }
}

export async function loadGuestRebookPage(guestId: string, bookingId: string) {
  return loadGuestRebookPanelPayload(guestId, bookingId);
}

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
