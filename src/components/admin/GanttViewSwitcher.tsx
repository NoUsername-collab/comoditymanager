"use client";

import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation";

export type GanttViewMode = "all" | "building" | "room";

type BuildingOption = { id: string; name: string; color_hex: string | null };
type RoomOption = {
  id: string;
  name: string;
  building_id: string;
  building_name: string;
};

export function GanttViewSwitcher({
  year,
  month,
  buildings,
  rooms,
}: {
  year: number;
  month: number;
  buildings: BuildingOption[];
  rooms: RoomOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = (searchParams.get("view") as GanttViewMode) || "all";
  const buildingId = searchParams.get("building") ?? "";
  const roomId = searchParams.get("room") ?? "";

  function go(patch: Record<string, string | null>) {
    const p = new URLSearchParams();
    p.set("y", String(year));
    p.set("m", String(month));

    const nextView = patch.view ?? view;
    p.set("view", nextView);

    if (nextView === "building") {
      const bid =
        patch.building !== undefined
          ? patch.building
          : buildingId || buildings[0]?.id || "";
      if (bid) p.set("building", bid);
    }

    if (nextView === "room") {
      const rid =
        patch.room !== undefined ? patch.room : roomId || rooms[0]?.id || "";
      if (rid) p.set("room", rid);
    }

    router.push(`/admin/calendar?${p.toString()}`);
  }

  const tabClass = (active: boolean) =>
    [
      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
      active
        ? "bg-zinc-900 text-white shadow-sm"
        : "text-zinc-600 hover:bg-white hover:text-zinc-900",
    ].join(" ");

  const roomsForBuilding = buildingId
    ? rooms.filter((r) => r.building_id === buildingId)
    : rooms;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Vizualizare
      </span>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={tabClass(view === "all")}
          onClick={() => go({ view: "all", building: null, room: null })}
        >
          Toate
        </button>
        <button
          type="button"
          className={tabClass(view === "building")}
          onClick={() =>
            go({
              view: "building",
              building: buildingId || buildings[0]?.id || null,
              room: null,
            })
          }
        >
          Per clădire
        </button>
        <button
          type="button"
          className={tabClass(view === "room")}
          onClick={() =>
            go({
              view: "room",
              room: roomId || rooms[0]?.id || null,
              building: null,
            })
          }
        >
          Per cameră
        </button>
      </div>

      {view === "building" && buildings.length > 0 && (
        <select
          value={buildingId || buildings[0]?.id || ""}
          onChange={(e) => go({ view: "building", building: e.target.value })}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      {view === "room" && rooms.length > 0 && (
        <select
          value={roomId || rooms[0]?.id || ""}
          onChange={(e) => go({ view: "room", room: e.target.value })}
          className="max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800"
        >
          {buildings.map((b) => {
            const group = rooms.filter((r) => r.building_id === b.id);
            if (group.length === 0) return null;
            return (
              <optgroup key={b.id} label={b.name}>
                {group.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      )}

      <span className="ml-auto text-xs text-zinc-500">
        {view === "all" && `${rooms.length} camere`}
        {view === "building" &&
          `${roomsForBuilding.length} camere · ${
            buildings.find((b) => b.id === buildingId)?.name ?? ""
          }`}
        {view === "room" &&
          rooms.find((r) => r.id === roomId)?.name &&
          `1 cameră · ${rooms.find((r) => r.id === roomId)?.building_name}`}
      </span>
    </div>
  );
}
