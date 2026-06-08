import { AvailabilityDashboardLazy } from "@/components/admin/availability/AvailabilityDashboardLazy";
import { loadAvailabilityDashboard } from "@/services/availability-month";
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
  const t = await getTranslations("admin.pages.calendar");
  let dashboard: Awaited<ReturnType<typeof loadAvailabilityDashboard>> | null =
    null;
  let error: string | null = null;

  try {
    dashboard = await loadAvailabilityDashboard(
      year,
      month,
      buildingId,
      featureFilter
    );
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : t("heatmapError");
  }

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
