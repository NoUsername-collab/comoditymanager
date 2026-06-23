import { StayHistoryPanel } from "@/components/admin/cazari/StayHistoryPanel";
import type { CancelledStay, CazariLabels } from "@/components/admin/cazari/types";
import { loadCazariSidebarHistoryData } from "@/services/cazari-page-data";
import { getTranslations } from "next-intl/server";

type Props = {
  query: string;
  cancelledItems: CancelledStay[];
  cancelledError: string | null;
  labels: CazariLabels;
};

function CazariHistoryAsideSkeleton() {
  return (
    <div
      className="cazari-history-skeleton admin-route-skeleton rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
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

export function CazariHistoryAsideFallback() {
  return (
    <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
      <CazariHistoryAsideSkeleton />
    </aside>
  );
}

export async function CazariHistoryAside({
  query,
  cancelledItems,
  cancelledError,
  labels,
}: Props) {
  const [tCommon, historyResult] = await Promise.all([
    getTranslations("admin.common"),
    loadCazariSidebarHistoryData(),
  ]);

  const formatCazariError = (message: string | null) =>
    message == null ? null : message.trim() ? message : tCommon("error");

  const { data, errors } = historyResult;

  return (
    <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
      <StayHistoryPanel
        completedItems={data.history}
        confirmedRecentItems={data.confirmedRecentHistory}
        cancelledItems={cancelledItems}
        query={query}
        completedError={formatCazariError(errors.history)}
        confirmedRecentError={formatCazariError(errors.confirmedRecentHistory)}
        cancelledError={cancelledError}
        labels={labels}
      />
    </aside>
  );
}
