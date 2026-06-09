import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AvailabilityDashboardLazy } from "@/components/admin/availability/AvailabilityDashboardLazy";
import { AdminAvailabilitySkeleton } from "@/components/admin/loading/AdminAvailabilitySkeleton";
import { loadAvailabilityDashboard } from "@/services/availability-month";
import { parseGanttFeatureFilter } from "@/lib/gantt-query";
import { mondayOfWeekIso } from "@/domain/availability/week-range";
import { getTranslations } from "next-intl/server";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";

export type AvailabilityShellSearchParams = {
  y?: string;
  m?: string;
  day?: string;
  building?: string;
  view?: string;
  ws?: string;
  feat?: string;
};

function buildBaseQuery(
  year: number,
  month: number,
  extra: Record<string, string | undefined>
) {
  const p = new URLSearchParams({ y: String(year), m: String(month) });
  for (const [key, value] of Object.entries(extra)) {
    if (value) p.set(key, value);
  }
  return p.toString();
}

function buildHref(basePath: string, query: string, anchorHash?: string) {
  return `${basePath}?${query}${anchorHash ?? ""}`;
}

export async function AvailabilityDashboardShell({
  searchParams,
  basePath,
  anchorHash,
  className = "",
}: {
  searchParams: AvailabilityShellSearchParams;
  basePath: string;
  anchorHash?: string;
  className?: string;
}) {
  const buildingId = searchParams.building?.length ? searchParams.building : null;
  const featureFilter = parseGanttFeatureFilter(searchParams.feat);
  const view = searchParams.view === "week" ? "week" : "month";
  const effectiveTodayPromise = getEffectiveToday();

  const [tCommon, tPage, tNav, effectiveToday, dashboardResult] = await Promise.all([
    getTranslations("admin.common"),
    getTranslations("admin.availability"),
    getTranslations("admin.gantt"),
    effectiveTodayPromise,
    effectiveTodayPromise
      .then((today) => {
        const refDate = new Date(today + "T00:00:00");
        const year = Number(searchParams.y) || refDate.getFullYear();
        const month =
          searchParams.m !== undefined ? Number(searchParams.m) : refDate.getMonth();
        return loadAvailabilityDashboard(year, month, buildingId, featureFilter);
      })
      .then((data) => ({ ok: true as const, data }))
      .catch((e) => ({ ok: false as const, error: e })),
  ]);

  let dashboard: Awaited<ReturnType<typeof loadAvailabilityDashboard>> | null = null;
  let error: string | null = null;
  if (dashboardResult.ok) {
    dashboard = dashboardResult.data;
  } else {
    error =
      dashboardResult.error instanceof Error
        ? dashboardResult.error.message
        : tCommon("error");
  }

  const refDate = new Date(effectiveToday + "T00:00:00");
  const year = Number(searchParams.y) || refDate.getFullYear();
  const month =
    searchParams.m !== undefined ? Number(searchParams.m) : refDate.getMonth();
  const weekStart =
    searchParams.ws ??
    (view === "week" ? mondayOfWeekIso(searchParams.day ?? effectiveToday) : null);

  const prevM = month === 0 ? 11 : month - 1;
  const prevY = month === 0 ? year - 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const nextY = month === 11 ? year + 1 : year;

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (!dashboard) return null;

  const sharedExtra = {
    building: buildingId ?? undefined,
    feat: featureFilter !== "all" ? featureFilter : undefined,
    view: view === "week" ? "week" : undefined,
    ws: view === "week" ? weekStart ?? undefined : undefined,
  };

  return (
    <div className={className}>
      <div className="availability-dashboard-nav mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="availability-dashboard-nav__controls flex items-center gap-2">
          <Link
            href={buildHref(
              basePath,
              buildBaseQuery(prevY, prevM, sharedExtra),
              anchorHash
            )}
            className="availability-dashboard-nav__btn border border-zinc-300 text-sm font-medium"
            aria-label={tNav("previous")}
          >
            ←
          </Link>
          <span className="availability-dashboard-nav__title px-2 py-1.5 text-sm font-medium capitalize">
            {dashboard.title}
          </span>
          <Link
            href={buildHref(
              basePath,
              buildBaseQuery(nextY, nextM, sharedExtra),
              anchorHash
            )}
            className="availability-dashboard-nav__btn border border-zinc-300 text-sm font-medium"
            aria-label={tNav("next")}
          >
            →
          </Link>
        </div>
        <p className="text-sm">
          <strong>{dashboard.total_rooms}</strong> {tCommon("rooms")}
          {buildingId && ` (${tPage("buildingFilterActive")})`}
        </p>
      </div>

      <Suspense fallback={<AdminAvailabilitySkeleton />}>
        <AvailabilityDashboardLazy
          key={`${year}-${month}-${buildingId ?? "all"}-${featureFilter}`}
          dashboard={dashboard}
          initialDay={searchParams.day}
          buildingId={buildingId}
          featureFilter={featureFilter}
          view={view}
          weekStart={weekStart}
          basePath={basePath}
          anchorHash={anchorHash}
          today={effectiveToday}
        />
      </Suspense>
    </div>
  );
}
