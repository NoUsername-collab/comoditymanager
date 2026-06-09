import { cache } from "react";
import {
  listCancelledStayHistory,
  listCompletedStayHistory,
  listOperationalStays,
  listRecentlyConfirmedStayHistory,
} from "@/services/bookings";

export type CazariPageLists = {
  stays: Awaited<ReturnType<typeof listOperationalStays>>;
  history: Awaited<ReturnType<typeof listCompletedStayHistory>>;
  confirmedRecentHistory: Awaited<
    ReturnType<typeof listRecentlyConfirmedStayHistory>
  >;
  cancelledHistory: Awaited<ReturnType<typeof listCancelledStayHistory>>;
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

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

/** Application service — parallel fetch with per-list error isolation. */
export const loadCazariPageData = cache(async (): Promise<CazariPageLoadResult> => {
  const empty: CazariPageLists = {
    stays: [],
    history: [],
    confirmedRecentHistory: [],
    cancelledHistory: [],
  };

  const [staysResult, historyResult, confirmedRecentResult, cancelledResult] =
    await Promise.allSettled([
      listOperationalStays(),
      listCompletedStayHistory(28),
      listRecentlyConfirmedStayHistory(16),
      listCancelledStayHistory(28),
    ]);

  const data = { ...empty };
  const errors = {
    stays: null as string | null,
    history: null as string | null,
    confirmedRecentHistory: null as string | null,
    cancelledHistory: null as string | null,
  };

  if (staysResult.status === "fulfilled") {
    data.stays = staysResult.value;
  } else {
    errors.stays = errorMessage(staysResult.reason, "");
  }

  if (historyResult.status === "fulfilled") {
    data.history = historyResult.value;
  } else {
    errors.history = errorMessage(historyResult.reason, "");
  }

  if (confirmedRecentResult.status === "fulfilled") {
    data.confirmedRecentHistory = confirmedRecentResult.value;
  } else {
    errors.confirmedRecentHistory = errorMessage(
      confirmedRecentResult.reason,
      ""
    );
  }

  if (cancelledResult.status === "fulfilled") {
    data.cancelledHistory = cancelledResult.value;
  } else {
    errors.cancelledHistory = errorMessage(cancelledResult.reason, "");
  }

  return { data, errors };
});
