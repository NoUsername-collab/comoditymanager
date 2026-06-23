import { cache } from "react";
import {
  listCancelledStayHistory,
  listCompletedStayHistory,
  listOperationalStays,
  listRecentlyConfirmedStayHistory,
} from "@/services/bookings";
import type {
  CazariPageLists,
  CazariPageLoadResult,
  CazariSidebarHistoryLoadResult,
} from "@/domain/cazari/page-lists";

export type {
  CazariPageLists,
  CazariPageLoadResult,
  CazariSidebarHistoryLoadResult,
} from "@/domain/cazari/page-lists";

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

/** Primary lists for main column — stays + cancelled (anulate tab). */
export const loadCazariPrimaryData = cache(
  async (): Promise<Pick<CazariPageLoadResult, "data" | "errors">> => {
    const emptyStays: CazariPageLists["stays"] = [];
    const emptyCancelled: CazariPageLists["cancelledHistory"] = [];

    const [staysResult, cancelledResult] = await Promise.allSettled([
      listOperationalStays(),
      listCancelledStayHistory(28),
    ]);

    const data: Pick<CazariPageLists, "stays" | "cancelledHistory"> = {
      stays: emptyStays,
      cancelledHistory: emptyCancelled,
    };
    const errors: Pick<
      CazariPageLoadResult["errors"],
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
export const loadCazariSidebarHistoryData = cache(
  async (): Promise<CazariSidebarHistoryLoadResult> => {
    const empty: CazariSidebarHistoryLoadResult["data"] = {
      history: [],
      confirmedRecentHistory: [],
    };

    const [historyResult, confirmedRecentResult] = await Promise.allSettled([
      listCompletedStayHistory(28),
      listRecentlyConfirmedStayHistory(16),
    ]);

    const data = { ...empty };
    const errors: CazariSidebarHistoryLoadResult["errors"] = {
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

/** @deprecated Prefer loadCazariPrimaryData + loadCazariSidebarHistoryData. */
export const loadCazariOperationalData = loadCazariPrimaryData;

/** @deprecated Prefer loadCazariSidebarHistoryData. */
export const loadCazariHistoryData = cache(async () => {
  const [primary, sidebar] = await Promise.all([
    loadCazariPrimaryData(),
    loadCazariSidebarHistoryData(),
  ]);
  return {
    data: {
      history: sidebar.data.history,
      confirmedRecentHistory: sidebar.data.confirmedRecentHistory,
      cancelledHistory: primary.data.cancelledHistory,
    },
    errors: {
      history: sidebar.errors.history,
      confirmedRecentHistory: sidebar.errors.confirmedRecentHistory,
      cancelledHistory: primary.errors.cancelledHistory,
    },
  };
});

/** Application service — parallel fetch with per-list error isolation. */
export const loadCazariPageData = cache(async (): Promise<CazariPageLoadResult> => {
  const [primary, sidebar] = await Promise.all([
    loadCazariPrimaryData(),
    loadCazariSidebarHistoryData(),
  ]);

  return {
    data: {
      stays: primary.data.stays,
      history: sidebar.data.history,
      confirmedRecentHistory: sidebar.data.confirmedRecentHistory,
      cancelledHistory: primary.data.cancelledHistory,
    },
    errors: {
      stays: primary.errors.stays,
      history: sidebar.errors.history,
      confirmedRecentHistory: sidebar.errors.confirmedRecentHistory,
      cancelledHistory: primary.errors.cancelledHistory,
    },
  };
});
