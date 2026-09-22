import type { ConfirmedStayLike } from "@/domain/stays/confirmed-buckets";
import type { StayListView } from "@/domain/stays/horizon";
import type { StayPageLists } from "@/domain/stays/page-lists";
import { matchesStaySearchQuery } from "@/domain/stays/stay-search";

type OperationalStay = StayPageLists["stays"][number];
type HistoryStay = StayPageLists["history"][number];
type CancelledStay = StayPageLists["cancelledHistory"][number];
type OperationalStaySlice = ConfirmedStayLike & {
  status: string;
  room_names: string[];
};

export type StayFilteredLists = {
  filteredStays: OperationalStay[];
  filteredHistory: HistoryStay[];
  filteredConfirmedRecent: HistoryStay[];
  filteredCancelledHistory: CancelledStay[];
};

export function filterStayListsByQuery(
  data: Pick<
    StayPageLists,
    "stays" | "history" | "confirmedRecentHistory" | "cancelledHistory"
  >,
  query: string
): StayFilteredLists {
  const q = query.trim();
  if (!q) {
    return {
      filteredStays: data.stays,
      filteredHistory: data.history,
      filteredConfirmedRecent: data.confirmedRecentHistory,
      filteredCancelledHistory: data.cancelledHistory,
    };
  }

  const match = <T extends Parameters<typeof matchesStaySearchQuery>[0]>(
    items: T[]
  ) => items.filter((stay) => matchesStaySearchQuery(stay, q));

  return {
    filteredStays: match(data.stays),
    filteredHistory: match(data.history),
    filteredConfirmedRecent: match(data.confirmedRecentHistory),
    filteredCancelledHistory: match(data.cancelledHistory),
  };
}

/** Unassigned requests first, then by arrival date. */
export function sortRequestsByPriority<T extends OperationalStaySlice>(
  requests: T[]
): T[] {
  return [...requests].sort((a, b) => {
    const aUnassigned = a.room_names.length === 0 ? 0 : 1;
    const bUnassigned = b.room_names.length === 0 ? 0 : 1;
    if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;
    return a.check_in.localeCompare(b.check_in);
  });
}

export function shouldPinRequestsAboveConfirmed(
  view: StayListView,
  requestCount: number
): boolean {
  return view === "confirmed" && requestCount > 0;
}

export function splitOperationalStays<T extends OperationalStaySlice>(
  filteredStays: T[],
  effectiveToday: string,
  horizonEnd: string
): {
  requests: T[];
  confirmed: T[];
  confirmedVisible: T[];
  hiddenConfirmedCount: number;
} {
  const requests = sortRequestsByPriority(
    filteredStays.filter((s) => s.status === "cerere_noua")
  );
  const confirmed = filteredStays.filter((s) => s.status === "confirmata");
  const confirmedVisible = confirmed.filter(
    (s) =>
      s.check_in <= horizonEnd ||
      (s.check_in <= effectiveToday && s.check_out > effectiveToday)
  );
  const hiddenConfirmedCount = Math.max(
    0,
    confirmed.length - confirmedVisible.length
  );

  return { requests, confirmed, confirmedVisible, hiddenConfirmedCount };
}
