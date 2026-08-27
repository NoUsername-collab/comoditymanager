"use client";

import { AdminLinkButton } from "@/components/admin/ui/AdminLinkButton";
import { useTranslations } from "next-intl";
import type { StructureBuilding } from "@/services/location-structure";
import type { RoomOptionDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { AddFloorForm } from "@/components/admin/structure/AddFloorForm";
import { BuildingPoliciesForm } from "@/components/admin/BuildingPoliciesForm";
import { getBuildingTheme } from "@/lib/building-theme";
import { FloorStructureSection } from "./FloorStructureSection";
import { EditBuildingPanel } from "./EditBuildingPanel";
import { RoomStructureRow } from "./RoomStructureRow";

export function BuildingStructureCard({
  data,
  catalogOptions = [],
  catalogPolicies = [],
}: {
  data: StructureBuilding;
  catalogOptions?: RoomOptionDefinition[];
  catalogPolicies?: { option_id: string; mode: OptionPolicyMode }[];
}) {
  const t = useTranslations("admin.locationStructure");
  const tCommon = useTranslations("admin.common");
  const { building } = data;
  const theme = getBuildingTheme(building.ac_mode, building.name);
  const nextFloorSort =
    data.floors.length > 0
      ? Math.max(...data.floors.map((f) => f.sort_order)) + 1
      : 1;
  const duplicateFloorCount = data.floors.filter((f) => f.duplicateName).length;

  return (
    <article
      className={[
        "building-structure-card overflow-hidden rounded-xl border bg-white shadow-sm",
        theme.border,
      ].join(" ")}
    >
      <header
        className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3"
        style={{ borderBottomColor: theme.accent }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
              style={{ backgroundColor: theme.accent }}
            />
            <h2 className="text-lg font-bold text-zinc-900">{building.name}</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {data.floors.length} {tCommon("floors").toLowerCase()} ·{" "}
            {data.activeRoomCount}/{data.roomCount} {tCommon("rooms").toLowerCase()}{" "}
            {tCommon("active")}
          </p>
          {duplicateFloorCount > 0 && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950">
              {t("duplicateFloorsBanner", { count: duplicateFloorCount })}
            </p>
          )}
          <EditBuildingPanel building={building} />
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminLinkButton
            href={`/admin/rooms/new?building=${building.id}&return_to=structure`}
            size="sm"
          >
            + {tCommon("room")}
          </AdminLinkButton>
          <AdminLinkButton href="/admin/buildings" size="sm">
            {t("occupancyDashboard")}
          </AdminLinkButton>
        </div>
      </header>

      <div className="space-y-4 px-5 py-4">
        {catalogOptions.length > 0 && (
          <BuildingPoliciesForm
            buildingId={building.id}
            buildingName={building.name}
            acMode={building.ac_mode}
            options={catalogOptions}
            policies={catalogPolicies}
          />
        )}

        {data.floors.length === 0 && data.roomsWithoutFloor.length === 0 && (
          <p className="text-sm text-zinc-500">{t("emptyBuilding")}</p>
        )}

        {data.floors.map((floor) => (
          <FloorStructureSection
            key={floor.id}
            floor={floor}
            buildingId={building.id}
            allFloors={data.floors}
          />
        ))}

        {data.roomsWithoutFloor.length > 0 && (
          <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
            <h3 className="mb-2 text-sm font-bold text-amber-950">
              {t("withoutFloorSection")}
            </h3>
            <ul className="space-y-1.5">
              {data.roomsWithoutFloor.map((room) => (
                <RoomStructureRow key={room.id} room={room} floors={data.floors} />
              ))}
            </ul>
          </section>
        )}

        <AddFloorForm buildingId={building.id} nextSortOrder={nextFloorSort} />
      </div>
    </article>
  );
}
