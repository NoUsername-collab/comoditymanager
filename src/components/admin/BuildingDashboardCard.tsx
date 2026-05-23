import type { BuildingDashboard } from "@/services/building-dashboard";
import { getBuildingTheme } from "@/lib/building-theme";
import { BuildingDashboardCardInteractive } from "./BuildingDashboardCardInteractive";

export function BuildingDashboardCard({ data }: { data: BuildingDashboard }) {
  const theme = getBuildingTheme(data.building.ac_mode, data.building.name);
  return <BuildingDashboardCardInteractive data={data} theme={theme} />;
}
