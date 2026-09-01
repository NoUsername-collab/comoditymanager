import { listBuildingDashboards } from "@/services/building-dashboard";
import { listRoomOptions } from "@/services/room-catalog";

export async function loadBuildingsListPage(viewDate: string) {
  return listBuildingDashboards(viewDate)
    .then((data) => ({ ok: true as const, data }))
    .catch((error) => ({ ok: false as const, error }));
}

export async function loadNewBuildingPage() {
  return listRoomOptions().catch(
    () => [] as Awaited<ReturnType<typeof listRoomOptions>>,
  );
}
