import { StayHistoryPanel } from "@/features/stays/ui/StayHistoryPanel";
import type { CancelledStay, StayListLabels } from "@/features/stays/ui/types";
import { loadStaysSidebarHistoryData } from "@/services/stays-page-data";
import { getTranslations } from "next-intl/server";

type Props = {
  query: string;
  cancelledItems: CancelledStay[];
  cancelledError: string | null;
  labels: StayListLabels;
};

function StayHistoryAsideSkeleton() {
  return (
    <div
      className="stays-history-skeleton admin-route-skeleton rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
      aria-hidden
      aria-busy="true"
    >
      <div className="admin-route-skeleton__row h-4 w-2/5" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="admin-route-skeleton__row h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function StayHistoryAsideFallback() {
  return (
    <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
      <StayHistoryAsideSkeleton />
    </aside>
  );
}

export async function StayHistoryAside({
  query,
  cancelledItems,
  cancelledError,
  labels,
}: Props) {
  const [tCommon, historyResult] = await Promise.all([
    getTranslations("admin.common"),
    loadStaysSidebarHistoryData(),
  ]);

  const formatStayError = (message: string | null) =>
    message == null ? null : message.trim() ? message : tCommon("error");

  const { data, errors } = historyResult;

  return (
    <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
      <StayHistoryPanel
        completedItems={data.history}
        confirmedRecentItems={data.confirmedRecentHistory}
        cancelledItems={cancelledItems}
        query={query}
        completedError={formatStayError(errors.history)}
        confirmedRecentError={formatStayError(errors.confirmedRecentHistory)}
        cancelledError={cancelledError}
        labels={labels}
      />
    </aside>
  );
}
