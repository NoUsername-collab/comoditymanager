import { Suspense } from "react";
import { listRoomDashboards } from "@/services/room-dashboard";
import { listBuildings } from "@/services/buildings";
import { RoomDashboardCard } from "@/components/admin/RoomDashboardCard";
import { RoomsBuildingSection } from "@/components/admin/RoomsBuildingSection";
import { AvailabilityDatePicker } from "@/components/admin/AvailabilityDatePicker";
import { ClimateLegend } from "@/components/admin/ui/ClimateLegend";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { parseViewDate, viewDateLabel } from "@/lib/availability-date";

export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const viewDate = parseViewDate(params.date);
  const dateLabel = viewDateLabel(viewDate);
  let rooms: Awaited<ReturnType<typeof listRoomDashboards>> = [];
  let buildings: Awaited<ReturnType<typeof listBuildings>> = [];
  let error: string | null = null;

  try {
    [rooms, buildings] = await Promise.all([
      listRoomDashboards(viewDate),
      listBuildings(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  const buildingOrder = new Map(
    buildings.map((b, i) => [b.id, i])
  );

  const byBuilding = buildings
    .map((b) => ({
      building: b,
      rooms: rooms
        .filter((r) => r.building_id === b.id)
        .sort((a, c) => a.name.localeCompare(c.name)),
    }))
    .filter((g) => g.rooms.length > 0)
    .sort(
      (a, b) =>
        (buildingOrder.get(a.building.id) ?? 0) -
        (buildingOrder.get(b.building.id) ?? 0)
    );

  const active = rooms.filter((r) => r.is_active);
  const inactive = rooms.filter((r) => !r.is_active);

  return (
    <AdminRetroPageFrame
      title="Camere — Casa Emil"
      description="Grid compact pe dată — liberă, ocupată sau cerere în așteptare."
      action={{ href: "/admin/rooms/new", label: "+ Adaugă cameră" }}
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
        {byBuilding.map(({ building, rooms: groupRooms }) => (
          <RetroXpWindow
            key={building.id}
            title={`${building.name} — ${dateLabel}`}
          >
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
          </RetroXpWindow>
        ))}
      </div>

      {inactive.length > 0 && (
        <RetroXpWindow title="Camere inactive" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {inactive.map((r) => (
              <RoomDashboardCard key={r.id} room={r} />
            ))}
          </div>
        </RetroXpWindow>
      )}

      {active.length === 0 && !error && (
        <p className="mt-8 text-center text-zinc-500">Nicio cameră încă.</p>
      )}
    </AdminRetroPageFrame>
  );
}
