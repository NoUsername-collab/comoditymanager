import type {
  CancelledStayHistoryRow,
  CompletedStayHistoryRow,
  OperationalStayRow,
} from "@/domain/booking/row";

/** Shape of Cazări page list payloads — domain view, independent of loaders. */
export type StayPageLists = {
  stays: OperationalStayRow[];
  history: CompletedStayHistoryRow[];
  confirmedRecentHistory: CompletedStayHistoryRow[];
  cancelledHistory: CancelledStayHistoryRow[];
};

export type StayPageLoadResult = {
  data: StayPageLists;
  errors: {
    stays: string | null;
    history: string | null;
    confirmedRecentHistory: string | null;
    cancelledHistory: string | null;
  };
};

export type StaySidebarHistoryLoadResult = {
  data: Pick<StayPageLists, "history" | "confirmedRecentHistory">;
  errors: Pick<
    StayPageLoadResult["errors"],
    "history" | "confirmedRecentHistory"
  >;
};
