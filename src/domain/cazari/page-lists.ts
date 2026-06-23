import type {
  CancelledStayHistoryRow,
  CompletedStayHistoryRow,
  OperationalStayRow,
} from "@/domain/booking/row";

/** Shape of Cazări page list payloads — domain view, independent of loaders. */
export type CazariPageLists = {
  stays: OperationalStayRow[];
  history: CompletedStayHistoryRow[];
  confirmedRecentHistory: CompletedStayHistoryRow[];
  cancelledHistory: CancelledStayHistoryRow[];
};

export type CazariPageLoadResult = {
  data: CazariPageLists;
  errors: {
    stays: string | null;
    history: string | null;
    confirmedRecentHistory: string | null;
    cancelledHistory: string | null;
  };
};

export type CazariSidebarHistoryLoadResult = {
  data: Pick<CazariPageLists, "history" | "confirmedRecentHistory">;
  errors: Pick<
    CazariPageLoadResult["errors"],
    "history" | "confirmedRecentHistory"
  >;
};
