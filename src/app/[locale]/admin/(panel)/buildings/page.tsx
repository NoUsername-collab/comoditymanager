import { Suspense } from "react";
import { listBuildingDashboards } from "@/services/building-dashboard";
import { BuildingDashboardCard } from "@/components/admin/BuildingDashboardCard";
import { AvailabilityDatePicker } from "@/components/admin/AvailabilityDatePicker";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { ClimateLegend } from "@/components/admin/ui/ClimateLegend";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { parseViewDate } from "@/lib/availability-date";
import { guardOperatorRoute } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await guardOperatorRoute("/admin/buildings");
  const paramsPromise = searchParams;
  const [t, params, dashboardsResult] = await Promise.all([
    getTranslations("admin.pages.buildings"),
    paramsPromise,
    paramsPromise
      .then((p) => listBuildingDashboards(parseViewDate(p.date)))
      .then((data) => ({ ok: true as const, data }))
      .catch((e) => ({ ok: false as const, error: e })),
  ]);
  const viewDate = parseViewDate(params.date);
  let dashboards: Awaited<ReturnType<typeof listBuildingDashboards>> = [];
  let error: string | null = null;

  if (dashboardsResult.ok) {
    dashboards = dashboardsResult.data;
  } else {
    error =
      dashboardsResult.error instanceof Error
        ? dashboardsResult.error.message
        : t("unknownError");
  }

  return (
    <AdminPageFrame
      title={t("listTitle")}
      description={t("listDescription")}
      action={{ href: "/admin/buildings/new", label: t("addBuilding") }}
    >
      <div className="space-y-3">
        <Suspense fallback={null}>
          <AvailabilityDatePicker selectedDate={viewDate} />
        </Suspense>
        <ClimateLegend />
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {dashboards.map((d) => (
          <AdminPanel
            key={d.building.id}
            title={t("buildingFloorsTitle", { name: d.building.name })}
          >
            <BuildingDashboardCard data={d} />
          </AdminPanel>
        ))}
      </div>

      {dashboards.length === 0 && !error && (
        <AdminEmptyState
          emoji="🏠"
          title={t("noBuildings")}
          description={t("listDescription")}
          actionHref="/admin/buildings/new"
          actionLabel={t("addBuilding")}
        />
      )}
    </AdminPageFrame>
  );
}
