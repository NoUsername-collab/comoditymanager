import { Suspense } from "react";
import { listBuildingDashboards } from "@/services/building-dashboard";
import { BuildingDashboardCard } from "@/components/admin/BuildingDashboardCard";
import { AvailabilityDatePicker } from "@/components/admin/AvailabilityDatePicker";
import { ClimateLegend } from "@/components/admin/ui/ClimateLegend";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { parseViewDate } from "@/lib/availability-date";
import { getTranslations } from "next-intl/server";

export default async function BuildingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const t = await getTranslations("admin.pages.buildings");
  const params = await searchParams;
  const viewDate = parseViewDate(params.date);
  let dashboards: Awaited<ReturnType<typeof listBuildingDashboards>> = [];
  let error: string | null = null;

  try {
    dashboards = await listBuildingDashboards(viewDate);
  } catch (e) {
    error = e instanceof Error ? e.message : t("unknownError");
  }

  return (
    <AdminRetroPageFrame
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

      <div className="mt-6 space-y-4">
        {dashboards.map((d) => (
          <RetroXpWindow
            key={d.building.id}
            title={t("buildingFloorsTitle", { name: d.building.name })}
          >
            <BuildingDashboardCard data={d} />
          </RetroXpWindow>
        ))}
      </div>

      {dashboards.length === 0 && !error && (
        <p className="mt-8 text-center text-zinc-500">{t("noBuildings")}</p>
      )}
    </AdminRetroPageFrame>
  );
}
