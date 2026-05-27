import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AvailabilityDashboard } from "@/components/admin/availability/AvailabilityDashboard";
import { loadAvailabilityDashboard } from "@/services/availability-month";
import { parseGanttFeatureFilter } from "@/lib/gantt-query";
import { mondayOfWeekIso } from "@/domain/availability/week-range";
import { todayIso } from "@/lib/stay-dates";
import { getTranslations } from "next-intl/server";

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
  const tCommon = await getTranslations("admin.common");
  const tPage = await getTranslations("admin.availability");
  const now = new Date();
  const year = Number(searchParams.y) || now.getFullYear();
  const month = searchParams.m !== undefined ? Number(searchParams.m) : now.getMonth();
  const buildingId = searchParams.building?.length ? searchParams.building : null;
  const featureFilter = parseGanttFeatureFilter(searchParams.feat);
  const view = searchParams.view === "week" ? "week" : "month";
  const weekStart =
    searchParams.ws ?? (view === "week" ? mondayOfWeekIso(searchParams.day ?? todayIso()) : null);

  const prevM = month === 0 ? 11 : month - 1;
  const prevY = month === 0 ? year - 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const nextY = month === 11 ? year + 1 : year;

  let dashboard: Awaited<ReturnType<typeof loadAvailabilityDashboard>> | null = null;
  let error: string | null = null;

  try {
    dashboard = await loadAvailabilityDashboard(year, month, buildingId, featureFilter);
  } catch (e) {
    error = e instanceof Error ? e.message : tCommon("error");
  }

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={buildHref(
              basePath,
              buildBaseQuery(prevY, prevM, sharedExtra),
              anchorHash
            )}
            className="border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            ←
          </Link>
          <span className="px-2 py-1.5 text-sm font-medium capitalize">{dashboard.title}</span>
          <Link
            href={buildHref(
              basePath,
              buildBaseQuery(nextY, nextM, sharedExtra),
              anchorHash
            )}
            className="border border-zinc-300 px-3 py-2 text-sm font-medium"
          >
            →
          </Link>
        </div>
        <p className="text-sm">
          <strong>{dashboard.total_rooms}</strong> {tCommon("rooms")}
          {buildingId && ` (${tPage("buildingFilterActive")})`}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-500">
            {tPage("loadingPanel")}
          </div>
        }
      >
        <AvailabilityDashboard
          dashboard={dashboard}
          initialDay={searchParams.day}
          buildingId={buildingId}
          featureFilter={featureFilter}
          view={view}
          weekStart={weekStart}
          basePath={basePath}
          anchorHash={anchorHash}
        />
      </Suspense>
    </div>
  );
}
