import { cache } from "react";
import {
  listCancelledStayHistory,
  listCompletedStayHistory,
  listOperationalStays,
  listRecentlyConfirmedStayHistory,
} from "@/services/bookings";
import type {
  StayPageLists,
  StayPageLoadResult,
  StaySidebarHistoryLoadResult,
} from "@/domain/stays/page-lists";

export type {
  StayPageLists,
  StayPageLoadResult,
  StaySidebarHistoryLoadResult,
} from "@/domain/stays/page-lists";

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

/** Primary lists for main column — stays + cancelled (anulate tab). */
export const loadStaysPrimaryData = cache(
  async (): Promise<Pick<StayPageLoadResult, "data" | "errors">> => {
    const emptyStays: StayPageLists["stays"] = [];
    const emptyCancelled: StayPageLists["cancelledHistory"] = [];

    const [staysResult, cancelledResult] = await Promise.allSettled([
      listOperationalStays(),
      listCancelledStayHistory(28),
    ]);

    const data: Pick<StayPageLists, "stays" | "cancelledHistory"> = {
      stays: emptyStays,
      cancelledHistory: emptyCancelled,
    };
    const errors: Pick<
      StayPageLoadResult["errors"],
      "stays" | "cancelledHistory"
    > = {
      stays: null,
      cancelledHistory: null,
    };

    if (staysResult.status === "fulfilled") {
      data.stays = staysResult.value;
    } else {
      errors.stays = errorMessage(staysResult.reason, "");
    }

    if (cancelledResult.status === "fulfilled") {
      data.cancelledHistory = cancelledResult.value;
    } else {
      errors.cancelledHistory = errorMessage(cancelledResult.reason, "");
    }

    return {
      data: {
        ...data,
        history: [],
        confirmedRecentHistory: [],
      },
      errors: {
        ...errors,
        history: null,
        confirmedRecentHistory: null,
      },
    };
  }
);

/** Sidebar recap lists — streamed via Suspense on the cazări page. */
export const loadStaysSidebarHistoryData = cache(
  async (): Promise<StaySidebarHistoryLoadResult> => {
    const empty: StaySidebarHistoryLoadResult["data"] = {
      history: [],
      confirmedRecentHistory: [],
    };

    const [historyResult, confirmedRecentResult] = await Promise.allSettled([
      listCompletedStayHistory(28),
      listRecentlyConfirmedStayHistory(16),
    ]);

    const data = { ...empty };
    const errors: StaySidebarHistoryLoadResult["errors"] = {
      history: null,
      confirmedRecentHistory: null,
    };

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

    return { data, errors };
  }
);
