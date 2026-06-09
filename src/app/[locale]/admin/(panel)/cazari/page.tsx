import { Link } from "@/i18n/navigation";
import { addDays } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  buildCazariPageHref,
  CAZARI_HORIZON_DAYS,
  firstCazariQueryValue,
  readCazariHorizon,
  readCazariTab,
  type CazariHorizonKey,
  type CazariTab,
} from "@/domain/cazari/horizon";
import {
  filterCazariListsByQuery,
  splitOperationalStays,
} from "@/domain/cazari/page-splits";
import { loadCazariPageData } from "@/services/cazari-page-data";
import { buildCazariLabels } from "@/services/cazari-labels";
import { AdminStaySearchForm } from "@/components/admin/AdminStaySearchForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { CazariOpsToolbar } from "@/components/admin/cazari/CazariOpsToolbar";
import { ConfirmedBuckets } from "@/components/admin/cazari/ConfirmedBuckets";
import { StayHistoryPanel } from "@/components/admin/cazari/StayHistoryPanel";
import { StayList } from "@/components/admin/cazari/StayList";
import { getTranslations } from "next-intl/server";

export default async function AdminCazariPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    h?: string | string[];
    tab?: string | string[];
    reaccepted?: string;
  }>;
}) {
  const [tPages, tCommon, tFlow, params, effectiveToday, cazariResult] =
    await Promise.all([
      getTranslations("admin.pages.cazari"),
      getTranslations("admin.common"),
      getTranslations("booking.flowStatus"),
      searchParams,
      getEffectiveToday(),
      loadCazariPageData(),
    ]);

  const q = firstCazariQueryValue(params.q).trim();
  const horizon = readCazariHorizon(params.h);
  const tab = readCazariTab(params.tab);
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
    buildCazariPageHref({ q: q || undefined, h: next, tab });

  const buildTabHref = (next: CazariTab): string =>
    buildCazariPageHref({ q: q || undefined, h: horizon, tab: next });

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

  const confirmedLabels = {
    ...labels,
    emptyConfirmed: {
      title: q ? tPages("emptyConfirmedFilter") : tPages("emptyConfirmedActive"),
      description: q
        ? tPages("emptyConfirmedFilterDesc")
        : tPages("emptyConfirmedActiveDesc"),
      href: "/admin/calendar",
      label: tPages("openCalendar"),
    },
  };

  const description = (
    <div className="space-y-1">
      <p className="max-w-3xl text-sm leading-relaxed">{tPages("hubDescription")}</p>
      <p className="text-xs text-zinc-500">{tPages("searchExamples")}</p>
    </div>
  );

  return (
    <AdminRetroPageFrame title={tPages("title")} description={description} className="cazari-page">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]">
        <div className="min-w-0">
          <RetroXpWindow title={tPages("searchFilter")} className="mb-3">
            <div className="space-y-2">
              <AdminStaySearchForm
                defaultQuery={q}
                preserveParams={{
                  tab: tab === "refuzate" ? "refuzate" : undefined,
                  h: horizon,
                }}
              />
              <CazariOpsToolbar
                labels={labels}
                tab={tab}
                horizon={horizon}
                q={q}
                metrics={{
                  filteredStays: filtered.filteredStays.length,
                  cereri: cereri.length,
                  confirmate: confirmate.length,
                  filteredHistory: filtered.filteredHistory.length,
                  filteredRefused: filtered.filteredCancelledHistory.length,
                }}
                buildTabHref={buildTabHref}
                buildHorizonHref={buildHorizonHref}
                metricLabels={{
                  results: tPages("results"),
                  operational: tPages("operational"),
                  requests: tCommon("requests"),
                  confirmed: tCommon("confirmed"),
                  past: tCommon("past"),
                }}
              />
            </div>
          </RetroXpWindow>

          {params.reaccepted === "1" && (
            <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {tPages("reacceptedBanner")}
            </p>
          )}

          {cazariErrors.stays && (
            <p className="mb-4 text-sm text-red-800">
              {formatCazariError(cazariErrors.stays)}
            </p>
          )}

          {tab === "refuzate" ? (
            <StayList
              title={`${labels.tabRefused} (${filtered.filteredCancelledHistory.length})`}
              items={filtered.filteredCancelledHistory}
              variant="refuzate"
              returnTo="/admin/cazari?tab=refuzate"
              hasQuery={!!q}
              labels={labels}
            />
          ) : (
            <>
              <StayList
                title={`${tCommon("requests")} (${cereri.length})`}
                items={cereri}
                variant="cereri"
                returnTo="/admin/cazari"
                hasQuery={!!q}
                labels={labels}
              />

              <RetroXpWindow
                title={tPages("confirmedTitle", { count: confirmateVisible.length })}
                className="mb-3"
              >
                {hiddenConfirmateCount > 0 && (
                  <p className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                    {labels.groupedOutsideWindow(hiddenConfirmateCount)}
                  </p>
                )}
                <ConfirmedBuckets
                  items={confirmateVisible}
                  today={effectiveToday}
                  returnTo="/admin/cazari"
                  hasQuery={!!q}
                  labels={confirmedLabels}
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
              </RetroXpWindow>
            </>
          )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <StayHistoryPanel
            completedItems={filtered.filteredHistory}
            confirmedRecentItems={filtered.filteredConfirmedRecent}
            cancelledItems={filtered.filteredCancelledHistory}
            query={q}
            completedError={formatCazariError(cazariErrors.history)}
            confirmedRecentError={formatCazariError(
              cazariErrors.confirmedRecentHistory
            )}
            cancelledError={formatCazariError(cazariErrors.cancelledHistory)}
            labels={labels}
          />
        </aside>
      </div>
    </AdminRetroPageFrame>
  );
}
