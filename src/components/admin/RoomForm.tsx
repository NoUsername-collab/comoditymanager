"use client";

import type { AcMode, Building, Floor } from "@/types/database";
import { useMemo, useState } from "react";

type Props = {
  buildings: Building[];
  floorsByBuilding: Record<string, Floor[]>;
  createRoomAction: (formData: FormData) => Promise<void>;
  defaultBuildingId?: string;
};

function defaultHasAc(acMode: AcMode): boolean {
  if (acMode === "all_rooms") return true;
  if (acMode === "none") return false;
  return false;
}

export function RoomForm({
  buildings,
  floorsByBuilding,
  createRoomAction,
  defaultBuildingId,
}: Props) {
  const initial =
    defaultBuildingId && buildings.some((b) => b.id === defaultBuildingId)
      ? defaultBuildingId
      : (buildings[0]?.id ?? "");
  const [buildingId, setBuildingId] = useState(initial);
  const building = buildings.find((b) => b.id === buildingId);
  const acMode = building?.ac_mode ?? "per_room";
  const floors = floorsByBuilding[buildingId] ?? [];
  const showAcToggle = acMode === "per_room";
  const defaultAc = useMemo(() => defaultHasAc(acMode), [acMode]);
  const defaultPrice = building?.default_price_per_night ?? 250;

  return (
    <form action={createRoomAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Clădire *</span>
        <select
          name="building_id"
          required
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {building && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>
              AC clădire:{" "}
              {acMode === "all_rooms"
                ? "toate camerele (implicit DA)"
                : acMode === "none"
                  ? "fără AC (implicit NU)"
                  : "alegi per cameră mai jos"}
            </span>
            {building.color_hex && (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                <span
                  className="h-3 w-3 rounded-full border border-zinc-200"
                  style={{ backgroundColor: building.color_hex }}
                />
                Culoare în calendar
              </span>
            )}
          </p>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Etaj (opțional)</span>
        <select
          name="floor_id"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          defaultValue=""
        >
          <option value="">— fără etaj / parter simplu —</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Nume cameră *</span>
        <input
          name="name"
          required
          placeholder="Camera 1"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Capacitate (pers.)</span>
          <input
            name="capacity_base"
            type="number"
            min={1}
            defaultValue={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Preț / noapte (RON)</span>
          <input
            name="price_per_night"
            type="number"
            min={0}
            step={1}
            key={buildingId}
            defaultValue={defaultPrice}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      {showAcToggle ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="has_ac"
            defaultChecked={defaultAc}
            className="rounded"
          />
          <span className="text-sm">Cameră cu AC</span>
        </label>
      ) : (
        <input type="hidden" name="has_ac" value={defaultAc ? "on" : ""} />
      )}

      {!showAcToggle && (
        <p className="text-sm text-zinc-600">
          AC pentru această cameră: <strong>{defaultAc ? "Da" : "Nu"}</strong>{" "}
          (din politica clădirii)
        </p>
      )}

      <label className="flex items-center gap-2">
        <input type="checkbox" name="allows_extra_beds" className="rounded" />
        <span className="text-sm">Permite pat(uri) suplimentare</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Max paturi extra (pe cameră)</span>
        <input
          name="max_extra_beds_per_room"
          type="number"
          min={0}
          max={4}
          defaultValue={1}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Ordine afișare</span>
        <input
          name="sort_order"
          type="number"
          defaultValue={1}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Salvează camera
      </button>
    </form>
  );
}
