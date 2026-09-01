import { loadAdminDashboard } from "@/services/admin-dashboard";
import { loadAvailabilityDashboard } from "@/services/availability-month";
import type { GanttFeatureFilter } from "@/domain/gantt/filters";

export async function loadAdminHomePage() {
  return loadAdminDashboard();
}

export async function loadAvailabilityDashboardPage(
  year: number,
  month: number,
  buildingId: string | null,
  featureFilter: GanttFeatureFilter,
) {
  return loadAvailabilityDashboard(year, month, buildingId, featureFilter)
    .then((data) => ({ ok: true as const, data }))
    .catch((error) => ({ ok: false as const, error }));
}
