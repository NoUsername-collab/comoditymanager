import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { listRoomDashboards } from "@/services/room-dashboard";
import { listBuildings } from "@/services/buildings";
import { RoomDashboardCard } from "@/components/admin/RoomDashboardCard";
import { RoomsBuildingSection } from "@/components/admin/RoomsBuildingSection";
import { AvailabilityDatePicker } from "@/components/admin/AvailabilityDatePicker";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { ClimateLegend } from "@/components/admin/ui/ClimateLegend";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { parseViewDate, viewDateLabel } from "@/lib/availability-date";

export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [t, params, dataResult] = await Promise.all([
    getTranslations("admin.pages.rooms"),
    searchParams,
    searchParams
      .then((sp) => {
        const viewDate = parseViewDate(sp.date);
        return Promise.all([listRoomDashboards(viewDate), listBuildings()]);
      })
      .then(([rooms, buildings]) => ({ ok: true as const, rooms, buildings }))
      .catch((e) => ({ ok: false as const, error: e })),
  ]);
  const viewDate = parseViewDate(params.date);
  const dateLabel = viewDateLabel(viewDate);
  let rooms: Awaited<ReturnType<typeof listRoomDashboards>> = [];
  let buildings: Awaited<ReturnType<typeof listBuildings>> = [];
  let error: string | null = null;

  if (dataResult.ok) {
    rooms = dataResult.rooms;
    buildings = dataResult.buildings;
  } else {
    error =
      dataResult.error instanceof Error ? dataResult.error.message : t("genericError");
  }

  const buildingOrder = new Map(buildings.map((b, i) => [b.id, i]));

  const byBuilding = buildings
    .map((b) => ({
      building: b,
      rooms: rooms.filter((r) => r.building_id === b.id).sort((a, c) => a.name.localeCompare(c.name)),
    }))
    .filter((g) => g.rooms.length > 0)
    .sort((a, b) => (buildingOrder.get(a.building.id) ?? 0) - (buildingOrder.get(b.building.id) ?? 0));

  const active = rooms.filter((r) => r.is_active);
  const inactive = rooms.filter((r) => !r.is_active);

  return (
    <AdminPageFrame
      title={t("title")}
      description={t("description")}
      action={{ href: "/admin/rooms/new", label: t("addRoom") }}
    >
      <div className="space-y-3">
        <Suspense fallback={null}>
          <AvailabilityDatePicker selectedDate={viewDate} />
        </Suspense>
        <ClimateLegend />
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      <div className="mt-4 space-y-3">
        {byBuilding.map(({ building, rooms: groupRooms }) => (
          <AdminPanel key={building.id} title={`${building.name} — ${dateLabel}`}>
            <RoomsBuildingSection
              buildingId={building.id}
              buildingName={building.name}
              acMode={building.ac_mode}
              rooms={groupRooms}
              viewDateLabel={dateLabel}
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {groupRooms.map((r) => (
                <RoomDashboardCard key={r.id} room={r} />
              ))}
            </div>
          </AdminPanel>
        ))}
      </div>

      {inactive.length > 0 && (
        <AdminPanel title={t("inactiveRooms")} className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {inactive.map((r) => (
              <RoomDashboardCard key={r.id} room={r} />
            ))}
          </div>
        </AdminPanel>
      )}

      {active.length === 0 && !error && (
        <AdminEmptyState
          emoji="🛏️"
          title={t("noRooms")}
          description={t("description")}
          actionHref="/admin/rooms/new"
          actionLabel={t("addRoom")}
        />
      )}
    </AdminPageFrame>
  );
}

