import type { BuildingDashboard } from "@/services/building-dashboard";
import { getBuildingTheme } from "@/lib/building-theme";
import {
  ensureBuildingPoliciesFromLegacy,
  listRoomOptions,
} from "@/services/room-catalog";
import { BuildingDashboardCardInteractive } from "./BuildingDashboardCardInteractive";

export async function BuildingDashboardCard({
  data,
}: {
  data: BuildingDashboard;
}) {
  const theme = getBuildingTheme(data.building.ac_mode, data.building.name);

  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  let catalogPolicies: Awaited<
    ReturnType<typeof ensureBuildingPoliciesFromLegacy>
  > = [];

  try {
    catalogOptions = await listRoomOptions(true);
    catalogPolicies = await ensureBuildingPoliciesFromLegacy(
      data.building.id,
      data.building.ac_mode
    );
  } catch {
    /* catalog migration poate lipsi pe live */
  }

  return (
    <BuildingDashboardCardInteractive
      data={data}
      theme={theme}
      catalogOptions={catalogOptions}
      catalogPolicies={catalogPolicies}
    />
  );
}
