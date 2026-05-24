"use client";

import type { Building, Floor } from "@/types/database";
import type { RoomOptionDefinition, RoomTypeDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { computeRoomPrice, policyModeForOption, resolveOptionEnabled } from "@/lib/room-catalog-pricing";
import { useMemo, useState } from "react";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { RoomOptionFields } from "@/components/admin/catalog/RoomOptionFields";

type Props = {
  buildings: Building[];
  floorsByBuilding: Record<string, Floor[]>;
  types: RoomTypeDefinition[];
  options: RoomOptionDefinition[];
  policiesByBuilding: Record<string, { option_id: string; mode: OptionPolicyMode }[]>;
  createRoomAction: (formData: FormData) => Promise<void>;
  defaultBuildingId?: string;
};

function suggestPrice(
  building: Building | undefined,
  selectedType: RoomTypeDefinition | null,
  options: RoomOptionDefinition[],
  policies: { option_id: string; mode: OptionPolicyMode }[]
): number {
  if (!building) return 0;
  const defaultOptionIds = selectedType?.default_option_ids ?? [];
  const enabledOptions = options.filter((opt) => {
    const mode = policyModeForOption(policies, opt.id);
    return resolveOptionEnabled(
      mode,
      defaultOptionIds.includes(opt.id),
      defaultOptionIds.includes(opt.id)
    ).enabled;
  });
  return computeRoomPrice({
    type: selectedType,
    buildingDefaultPrice: building.default_price_per_night ?? 0,
    enabledOptions,
  });
}

export function RoomForm({
  buildings,
  floorsByBuilding,
  types,
  options,
  policiesByBuilding,
  createRoomAction,
  defaultBuildingId,
}: Props) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const initial =
    defaultBuildingId && buildings.some((b) => b.id === defaultBuildingId)
      ? defaultBuildingId
      : (buildings[0]?.id ?? "");
  const [buildingId, setBuildingId] = useState(initial);
  const defaultTypeId = types.find((t) => t.slug === "double")?.id ?? types[0]?.id ?? "";
  const [typeId, setTypeId] = useState(defaultTypeId);

  const building = buildings.find((b) => b.id === buildingId);
  const floors = floorsByBuilding[buildingId] ?? [];
  const policies = policiesByBuilding[buildingId] ?? [];
  const selectedType = types.find((t) => t.id === typeId) ?? null;

  const suggestedPrice = useMemo(
    () => suggestPrice(building, selectedType, options, policies),
    [building, selectedType, options, policies]
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "single" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
        >
          O cameră
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "bulk" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
        >
          Bulk (mai multe)
        </button>
      </div>

      <AdminPendingForm action={createRoomAction} className="space-y-5">
        <input type="hidden" name="create_mode" value={mode} />

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
        </label>

        <label className="block">
          <span className="text-sm font-medium">Etaj (opțional)</span>
          <select
            name="floor_id"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            defaultValue=""
          >
            <option value="">— fără etaj —</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Tip cameră *</span>
          <select
            name="room_type_definition_id"
            required
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.capacity_base} pers.
                {t.base_price_per_night > 0 ? ` · ${t.base_price_per_night} RON` : ""}
              </option>
            ))}
          </select>
        </label>

        {mode === "single" ? (
          <label className="block">
            <span className="text-sm font-medium">Nume cameră *</span>
            <input
              name="name"
              required
              placeholder="Camera 1"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">Prefix nume *</span>
              <input
                name="name_prefix"
                required
                defaultValue="Camera "
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">De la nr.</span>
              <input
                name="start_number"
                type="number"
                min={1}
                defaultValue={1}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Câte camere</span>
              <input
                name="bulk_count"
                type="number"
                min={1}
                max={50}
                defaultValue={5}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </label>
          </div>
        )}

        <RoomOptionFields
          options={options}
          policies={policies}
          selectedType={selectedType}
          selectedOptionIds={selectedType?.default_option_ids ?? []}
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Preț / noapte (RON)</span>
            <span className="block text-xs text-zinc-500">
              0 = calculează automat ({suggestedPrice} RON sugerat)
            </span>
            <input
              name="price_per_night"
              type="number"
              min={0}
              step={1}
              key={`${buildingId}-${typeId}`}
              defaultValue={suggestedPrice || building?.default_price_per_night || 0}
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
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="allows_extra_beds" className="rounded" />
          <span className="text-sm">Permite pat(uri) suplimentare</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Max paturi extra</span>
          <input
            name="max_extra_beds_per_room"
            type="number"
            min={0}
            max={4}
            defaultValue={1}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {mode === "bulk" ? "Creează camerele" : "Salvează camera"}
        </button>
      </AdminPendingForm>
    </div>
  );
}
