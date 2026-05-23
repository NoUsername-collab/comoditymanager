"use client";

import type { Building, Floor } from "@/types/database";
import { useState } from "react";

type RoomData = {
  id: string;
  building_id: string;
  floor_id: string | null;
  name: string;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  has_ac: boolean;
  price_per_night: number;
  is_active: boolean;
  sort_order: number;
  building_ac_mode?: string;
};

type Props = {
  room: RoomData;
  buildings: Building[];
  floorsByBuilding: Record<string, Floor[]>;
  updateRoomAction: (formData: FormData) => Promise<void>;
};

export function RoomEditForm({
  room,
  buildings,
  floorsByBuilding,
  updateRoomAction,
}: Props) {
  const [buildingId, setBuildingId] = useState(room.building_id);
  const acMode = buildings.find((b) => b.id === buildingId)?.ac_mode ?? "per_room";
  const showAc = acMode === "per_room";
  const floors = floorsByBuilding[buildingId] ?? [];

  return (
    <form action={updateRoomAction} className="mt-8 space-y-5">
      <input type="hidden" name="id" value={room.id} />

      <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={room.is_active}
          className="rounded"
        />
        <span className="text-sm font-medium">Cameră activă (debifează = dezactivată)</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Clădire</span>
        <select
          name="building_id"
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
      </label>

      <label className="block">
        <span className="text-sm font-medium">Etaj</span>
        <select
          name="floor_id"
          defaultValue={room.floor_id ?? ""}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        >
          <option value="">— fără —</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Nume</span>
        <input
          name="name"
          defaultValue={room.name}
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Capacitate</span>
          <input
            name="capacity_base"
            type="number"
            min={1}
            defaultValue={room.capacity_base}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Preț/noapte</span>
          <input
            name="price_per_night"
            type="number"
            min={0}
            defaultValue={room.price_per_night}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      {showAc ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="has_ac"
            defaultChecked={room.has_ac}
            className="rounded"
          />
          <span className="text-sm">AC</span>
        </label>
      ) : (
        <input type="hidden" name="has_ac" value={room.has_ac ? "on" : ""} />
      )}

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="allows_extra_beds"
          defaultChecked={room.allows_extra_beds}
          className="rounded"
        />
        <span className="text-sm">Paturi suplimentare</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Max paturi extra</span>
        <input
          name="max_extra_beds_per_room"
          type="number"
          min={0}
          max={4}
          defaultValue={room.max_extra_beds_per_room}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Ordine</span>
        <input
          name="sort_order"
          type="number"
          defaultValue={room.sort_order}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Salvează modificările
      </button>
    </form>
  );
}
