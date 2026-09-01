import { AvailabilityDashboardLazy } from "@/features/availability/ui/AvailabilityDashboardLazy";
import { loadAvailabilityDashboardPage } from "@/features/availability/loaders";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";
import type { AvailabilityPanelView } from "@/lib/availability-panel-query";
import { getTranslations } from "next-intl/server";

export async function CalendarAvailabilityStream({
  year,
  month,
  buildingId,
  featureFilter,
  view,
  weekStart,
  initialDay,
  today,
}: {
  year: number;
  month: number;
  buildingId: string | null;
  featureFilter: GanttFeatureFilter;
  view: AvailabilityPanelView;
  weekStart: string | null;
  initialDay?: string;
  today: string;
}) {
  const [t, dashboardResult] = await Promise.all([
    getTranslations("admin.pages.calendar"),
    loadAvailabilityDashboardPage(year, month, buildingId, featureFilter),
  ]);

  const dashboard = dashboardResult.ok ? dashboardResult.data : null;
  const error = dashboardResult.ok
    ? null
    : dashboardResult.error instanceof Error
      ? dashboardResult.error.message
      : t("heatmapError");

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (!dashboard) return null;

  return (
    <AvailabilityDashboardLazy
      key={`${year}-${month}-${buildingId ?? "all"}-${featureFilter}`}
      dashboard={dashboard}
      initialDay={initialDay}
      buildingId={buildingId}
      featureFilter={featureFilter}
      view={view}
      weekStart={weekStart}
      basePath="/admin/calendar"
      queryPrefix="avail_"
      extraQueryParams={{ avail: "1" }}
      today={today}
    />
  );
}
