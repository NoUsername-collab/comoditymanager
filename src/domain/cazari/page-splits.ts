import type { ConfirmedStayLike } from "@/domain/cazari/confirmed-buckets";
import type { CazariView } from "@/domain/cazari/horizon";
import type { CazariPageLists } from "@/services/cazari-page-data";
import { matchesStaySearchQuery } from "@/domain/cazari/stay-search";

type OperationalStay = CazariPageLists["stays"][number];
type HistoryStay = CazariPageLists["history"][number];
type CancelledStay = CazariPageLists["cancelledHistory"][number];
type OperationalStaySlice = ConfirmedStayLike & { status: string };

export type CazariFilteredLists = {
  filteredStays: OperationalStay[];
  filteredHistory: HistoryStay[];
  filteredConfirmedRecent: HistoryStay[];
  filteredCancelledHistory: CancelledStay[];
  cereri: OperationalStay[];
  confirmate: OperationalStay[];
  confirmateVisible: OperationalStay[];
  hiddenConfirmateCount: number;
};

export function filterCazariListsByQuery(
  data: Pick<
    CazariPageLists,
    "stays" | "history" | "confirmedRecentHistory" | "cancelledHistory"
  >,
  query: string
): Pick<
  CazariFilteredLists,
  | "filteredStays"
  | "filteredHistory"
  | "filteredConfirmedRecent"
  | "filteredCancelledHistory"
> {
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

/** Cereri fără cameră alocată apar primele, apoi după data sosirii. */
export function sortCereriByPriority<
  T extends OperationalStaySlice & { room_names: string[] },
>(cereri: T[]): T[] {
  return [...cereri].sort((a, b) => {
    const aUnassigned = a.room_names.length === 0 ? 0 : 1;
    const bUnassigned = b.room_names.length === 0 ? 0 : 1;
    if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;
    return a.check_in.localeCompare(b.check_in);
  });
}

export function shouldPinCereriAboveConfirmate(
  view: CazariView,
  cereriCount: number
): boolean {
  return view === "confirmate" && cereriCount > 0;
}

export function splitOperationalStays<T extends OperationalStaySlice>(
  filteredStays: T[],
  effectiveToday: string,
  horizonEnd: string
): {
  cereri: T[];
  confirmate: T[];
  confirmateVisible: T[];
  hiddenConfirmateCount: number;
} {
  const cereri = sortCereriByPriority(
    filteredStays.filter((s) => s.status === "cerere_noua")
  );
  const confirmate = filteredStays.filter((s) => s.status === "confirmata");
  const confirmateVisible = confirmate.filter(
    (s) =>
      s.check_in <= horizonEnd ||
      (s.check_in <= effectiveToday && s.check_out > effectiveToday)
  );
  const hiddenConfirmateCount = Math.max(
    0,
    confirmate.length - confirmateVisible.length
  );

  return { cereri, confirmate, confirmateVisible, hiddenConfirmateCount };
}
