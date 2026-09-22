import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { addDays, todayIso } from "@/lib/stay-dates";
import {
  buildStaysPageHref,
  STAY_HORIZON_DAYS,
  firstStayQueryValue,
  readStayHorizon,
  readStayListView,
  type StayHorizonKey,
  type StayListView,
} from "@/domain/stays/horizon";
import {
  filterStayListsByQuery,
  shouldPinRequestsAboveConfirmed,
  splitOperationalStays,
} from "@/domain/stays/page-splits";
import { buildStayListLabels, loadStaysPage } from "@/features/stays/loaders";
import { formatStayLabel } from "@/lib/stay-label-format";
import { AdminStaySearchForm } from "@/features/stays/ui/AdminStaySearchForm";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { StayOpsToolbar } from "@/features/stays/ui/StayOpsToolbar";
import { ConfirmedBuckets } from "@/features/stays/ui/ConfirmedBuckets";
import {
  StayHistoryAside,
  StayHistoryAsideFallback,
} from "@/features/stays/ui/StayHistoryAside";
import { StayList } from "@/features/stays/ui/StayList";
import { StayOperativeShell } from "@/features/stays/ui/StayOperativeShell";
import { getTranslations } from "next-intl/server";

export default async function AdminStaysPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    h?: string | string[];
    view?: string | string[];
    tab?: string | string[];
    reaccepted?: string;
  }>;
}) {
  const [tPages, tCommon, tFlow, params, effectiveToday, staysPage] =
    await Promise.all([
      getTranslations("admin.pages.stays"),
      getTranslations("admin.common"),
      getTranslations("booking.flowStatus"),
      searchParams,
      todayIso(),
      loadStaysPage(),
    ]);
  const { staysResult, postCheckoutPolicy } = staysPage;

  const q = firstStayQueryValue(params.q).trim();
  const horizon = readStayHorizon(params.h);
  const view = readStayListView(params.view, params.tab);
  const horizonEnd = addDays(effectiveToday, STAY_HORIZON_DAYS[horizon]);

  const labels = buildStayListLabels({ tPages, tCommon, tFlow });

  const { data: staysData, errors: staysErrors } = staysResult;
  const formatStayError = (message: string | null) =>
    message == null ? null : message.trim() ? message : tCommon("error");

  const filtered = filterStayListsByQuery(staysData, q);
  const {
    requests,
    confirmed,
    confirmedVisible,
    hiddenConfirmedCount,
  } = splitOperationalStays(filtered.filteredStays, effectiveToday, horizonEnd);

  const buildHorizonHref = (next: StayHorizonKey): string =>
    buildStaysPageHref({ q: q || undefined, h: next, view });

  const buildViewHref = (next: StayListView): string =>
    buildStaysPageHref({ q: q || undefined, h: horizon, view: next });

  const nextHorizon: StayHorizonKey =
    horizon === "1d"
      ? "7d"
      : horizon === "7d"
        ? "30d"
        : horizon === "30d"
          ? "60d"
          : horizon === "60d"
            ? "180d"
            : "365d";

  return (
    <AdminPageFrame title={tPages("title")} className="stays-page">
      <StayOperativeShell
        today={effectiveToday}
        canEditAfterCheckout={postCheckoutPolicy.canEditAfterCheckout}
      >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]">
        <div className="min-w-0">
          <AdminPanel
            title={tPages("searchFilter")}
            className="stays-filter-panel mb-3"
            bodyClassName="stays-filter-panel__body"
          >
            <div className="stays-filter-panel__stack">
              <AdminStaySearchForm
                defaultQuery={q}
                preserveParams={{
                  view: view !== "confirmed" ? view : undefined,
                  h: horizon,
                }}
              />
              <StayOpsToolbar
                labels={labels}
                view={view}
                horizon={horizon}
                metrics={{
                  requests: requests.length,
                  confirmed: confirmed.length,
                  cancelled: filtered.filteredCancelledHistory.length,
                }}
                buildViewHref={buildViewHref}
                buildHorizonHref={buildHorizonHref}
                filtersAria={tPages("viewFiltersAria")}
                filterLabels={{
                  requests: tCommon("newRequestsLabel"),
                  confirmed: tCommon("confirmed"),
                  cancelled: tPages("filterCancelled"),
                }}
              />
            </div>
          </AdminPanel>

          {params.reaccepted === "1" && (
            <p className="admin-banner admin-banner--success mb-4">
              {tPages("reacceptedBanner")}
            </p>
          )}

          {staysErrors.stays && (
            <p className="mb-4 text-sm text-red-800">
              {formatStayError(staysErrors.stays)}
            </p>
          )}

          {view === "cancelled" ? (
            <StayList
              title={`${tPages("filterCancelled")} (${filtered.filteredCancelledHistory.length})`}
              items={filtered.filteredCancelledHistory}
              variant="cancelled"
              returnTo={buildStaysPageHref({ view: "cancelled", h: horizon, q: q || undefined })}
              hasQuery={!!q}
              labels={labels}
            />
          ) : null}

          {view === "requests" ? (
            <StayList
              title={`${tCommon("newRequestsLabel")} (${requests.length})`}
              items={requests}
              variant="requests"
              returnTo={buildStaysPageHref({ view: "requests", h: horizon, q: q || undefined })}
              hasQuery={!!q}
              labels={labels}
            />
          ) : null}

          {view === "confirmed" ? (
            <>
              {shouldPinRequestsAboveConfirmed(view, requests.length) ? (
                <StayList
                  className="stays-pinned-requests"
                  title={`${tCommon("newRequestsLabel")} (${requests.length})`}
                  items={requests}
                  variant="requests"
                  returnTo={buildStaysPageHref({
                    h: horizon,
                    q: q || undefined,
                  })}
                  hasQuery={!!q}
                  labels={labels}
                />
              ) : null}
            <AdminPanel
              title={tPages("confirmedTitle", { count: confirmedVisible.length })}
              className="mb-3"
            >
              {hiddenConfirmedCount > 0 && (
                <p className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  {formatStayLabel(labels.groupedOutsideWindow, {
                    count: hiddenConfirmedCount,
                  })}
                </p>
              )}
              <ConfirmedBuckets
                items={confirmedVisible}
                today={effectiveToday}
                returnTo={buildStaysPageHref({ h: horizon, q: q || undefined })}
                hasQuery={!!q}
                labels={labels}
              />
              {horizon !== "365d" && (
                <div className="mt-3">
                  <Link
                    href={buildHorizonHref(nextHorizon)}
                    className="stays-load-more inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {labels.loadMore}
                  </Link>
                </div>
              )}
            </AdminPanel>
            </>
          ) : null}
        </div>

        <Suspense fallback={<StayHistoryAsideFallback />}>
          <StayHistoryAside
            query={q}
            cancelledItems={filtered.filteredCancelledHistory}
            cancelledError={formatStayError(staysErrors.cancelledHistory)}
            labels={labels}
          />
        </Suspense>
      </div>
      </StayOperativeShell>
    </AdminPageFrame>
  );
}
