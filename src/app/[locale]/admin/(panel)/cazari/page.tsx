import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { addDays } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  buildCazariPageHref,
  CAZARI_HORIZON_DAYS,
  firstCazariQueryValue,
  readCazariHorizon,
  readCazariView,
  type CazariHorizonKey,
  type CazariView,
} from "@/domain/cazari/horizon";
import {
  filterCazariListsByQuery,
  shouldPinCereriAboveConfirmate,
  splitOperationalStays,
} from "@/domain/cazari/page-splits";
import { loadCazariPrimaryData } from "@/services/cazari-page-data";
import { buildCazariLabels } from "@/services/cazari-labels";
import { formatCazariLabel } from "@/lib/cazari-label-format";
import { AdminStaySearchForm } from "@/components/admin/AdminStaySearchForm";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { CazariOpsToolbar } from "@/components/admin/cazari/CazariOpsToolbar";
import { ConfirmedBuckets } from "@/components/admin/cazari/ConfirmedBuckets";
import {
  CazariHistoryAside,
  CazariHistoryAsideFallback,
} from "@/components/admin/cazari/CazariHistoryAside";
import { StayList } from "@/components/admin/cazari/StayList";
import { CazariOperativeShell } from "@/components/admin/cazari/CazariOperativeShell";
import { resolvePostCheckoutEditPolicy } from "@/services/bookings/post-checkout-guard";
import { getTranslations } from "next-intl/server";

export default async function AdminCazariPage({
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
  const [tPages, tCommon, tFlow, params, effectiveToday, cazariResult, postCheckoutPolicy] =
    await Promise.all([
      getTranslations("admin.pages.cazari"),
      getTranslations("admin.common"),
      getTranslations("booking.flowStatus"),
      searchParams,
      getEffectiveToday(),
      loadCazariPrimaryData(),
      resolvePostCheckoutEditPolicy().catch(() => ({
        memberRole: null,
        allowPostCheckoutEdits: false,
        canEditAfterCheckout: false,
      })),
    ]);

  const q = firstCazariQueryValue(params.q).trim();
  const horizon = readCazariHorizon(params.h);
  const view = readCazariView(params.view, params.tab);
  const horizonEnd = addDays(effectiveToday, CAZARI_HORIZON_DAYS[horizon]);

  const labels = buildCazariLabels({ tPages, tCommon, tFlow });

  const { data: cazariData, errors: cazariErrors } = cazariResult;
  const formatCazariError = (message: string | null) =>
    message == null ? null : message.trim() ? message : tCommon("error");

  const filtered = filterCazariListsByQuery(cazariData, q);
  const {
    cereri,
    confirmate,
    confirmateVisible,
    hiddenConfirmateCount,
  } = splitOperationalStays(filtered.filteredStays, effectiveToday, horizonEnd);

  const buildHorizonHref = (next: CazariHorizonKey): string =>
    buildCazariPageHref({ q: q || undefined, h: next, view });

  const buildViewHref = (next: CazariView): string =>
    buildCazariPageHref({ q: q || undefined, h: horizon, view: next });

  const nextHorizon: CazariHorizonKey =
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
    <AdminPageFrame title={tPages("title")} className="cazari-page">
      <CazariOperativeShell
        today={effectiveToday}
        canEditAfterCheckout={postCheckoutPolicy.canEditAfterCheckout}
      >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]">
        <div className="min-w-0">
          <AdminPanel
            title={tPages("searchFilter")}
            className="cazari-filter-panel mb-3"
            bodyClassName="cazari-filter-panel__body"
          >
            <div className="cazari-filter-panel__stack">
              <AdminStaySearchForm
                defaultQuery={q}
                preserveParams={{
                  view: view !== "confirmate" ? view : undefined,
                  h: horizon,
                }}
              />
              <CazariOpsToolbar
                labels={labels}
                view={view}
                horizon={horizon}
                metrics={{
                  cereri: cereri.length,
                  confirmate: confirmate.length,
                  anulate: filtered.filteredCancelledHistory.length,
                }}
                buildViewHref={buildViewHref}
                buildHorizonHref={buildHorizonHref}
                filtersAria={tPages("viewFiltersAria")}
                filterLabels={{
                  cereri: tCommon("newRequestsLabel"),
                  confirmate: tCommon("confirmed"),
                  anulate: tPages("filterAnulate"),
                }}
              />
            </div>
          </AdminPanel>

          {params.reaccepted === "1" && (
            <p className="admin-banner admin-banner--success mb-4">
              {tPages("reacceptedBanner")}
            </p>
          )}

          {cazariErrors.stays && (
            <p className="mb-4 text-sm text-red-800">
              {formatCazariError(cazariErrors.stays)}
            </p>
          )}

          {view === "anulate" ? (
            <StayList
              title={`${tPages("filterAnulate")} (${filtered.filteredCancelledHistory.length})`}
              items={filtered.filteredCancelledHistory}
              variant="refuzate"
              returnTo={buildCazariPageHref({ view: "anulate", h: horizon, q: q || undefined })}
              hasQuery={!!q}
              labels={labels}
            />
          ) : null}

          {view === "cereri" ? (
            <StayList
              title={`${tCommon("newRequestsLabel")} (${cereri.length})`}
              items={cereri}
              variant="cereri"
              returnTo={buildCazariPageHref({ view: "cereri", h: horizon, q: q || undefined })}
              hasQuery={!!q}
              labels={labels}
            />
          ) : null}

          {view === "confirmate" ? (
            <>
              {shouldPinCereriAboveConfirmate(view, cereri.length) ? (
                <StayList
                  className="cazari-pinned-cereri"
                  title={`${tCommon("newRequestsLabel")} (${cereri.length})`}
                  subtitle={tPages("pendingPinnedHint")}
                  items={cereri}
                  variant="cereri"
                  returnTo={buildCazariPageHref({
                    h: horizon,
                    q: q || undefined,
                  })}
                  hasQuery={!!q}
                  labels={labels}
                />
              ) : null}
            <AdminPanel
              title={tPages("confirmedTitle", { count: confirmateVisible.length })}
              className="mb-3"
            >
              {hiddenConfirmateCount > 0 && (
                <p className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  {formatCazariLabel(labels.groupedOutsideWindow, {
                    count: hiddenConfirmateCount,
                  })}
                </p>
              )}
              <ConfirmedBuckets
                items={confirmateVisible}
                today={effectiveToday}
                returnTo={buildCazariPageHref({ h: horizon, q: q || undefined })}
                hasQuery={!!q}
                labels={labels}
              />
              {horizon !== "365d" && (
                <div className="mt-3">
                  <Link
                    href={buildHorizonHref(nextHorizon)}
                    className="cazari-load-more inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {labels.loadMore}
                  </Link>
                </div>
              )}
            </AdminPanel>
            </>
          ) : null}
        </div>

        <Suspense fallback={<CazariHistoryAsideFallback />}>
          <CazariHistoryAside
            query={q}
            cancelledItems={filtered.filteredCancelledHistory}
            cancelledError={formatCazariError(cazariErrors.cancelledHistory)}
            labels={labels}
          />
        </Suspense>
      </div>
      </CazariOperativeShell>
    </AdminPageFrame>
  );
}
