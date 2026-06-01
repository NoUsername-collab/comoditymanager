"use client";

import type { Building, Floor } from "@/types/database";
import type { RoomOptionDefinition, RoomTypeDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import {
  buildBulkRoomNames,
  type BulkNamingMode,
} from "@/domain/room/bulk-names";
import { computeRoomPrice, policyModeForOption, resolveOptionEnabled } from "@/lib/room-catalog-pricing";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { RoomOptionFields } from "@/components/admin/catalog/RoomOptionFields";

type Props = {
  buildings: Building[];
  floorsByBuilding: Record<string, Floor[]>;
  types: RoomTypeDefinition[];
  options: RoomOptionDefinition[];
  policiesByBuilding: Record<string, { option_id: string; mode: OptionPolicyMode }[]>;
  createRoomAction: (formData: FormData) => Promise<void>;
  defaultBuildingId?: string;
  defaultFloorId?: string;
  returnTo?: "structure";
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
  defaultFloorId,
  returnTo,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tRooms = useTranslations("admin.roomForm");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const initial =
    defaultBuildingId && buildings.some((b) => b.id === defaultBuildingId)
      ? defaultBuildingId
      : (buildings[0]?.id ?? "");
  const [buildingId, setBuildingId] = useState(initial);
  const initialFloor =
    defaultFloorId &&
    (floorsByBuilding[initial] ?? []).some((f) => f.id === defaultFloorId)
      ? defaultFloorId
      : "";
  const [floorId, setFloorId] = useState(initialFloor);
  const defaultTypeId = types.find((t) => t.slug === "double")?.id ?? types[0]?.id ?? "";
  const [typeId, setTypeId] = useState(defaultTypeId);
  const [bulkNaming, setBulkNaming] = useState<BulkNamingMode>("prefix");
  const [namePrefix, setNamePrefix] = useState(tRooms("roomPrefixDefault"));
  const [startNumber, setStartNumber] = useState(1);
  const [bulkCount, setBulkCount] = useState(5);

  const building = buildings.find((b) => b.id === buildingId);
  const floors = floorsByBuilding[buildingId] ?? [];
  const policies = policiesByBuilding[buildingId] ?? [];
  const selectedType = types.find((t) => t.id === typeId) ?? null;

  const suggestedPrice = useMemo(
    () => suggestPrice(building, selectedType, options, policies),
    [building, selectedType, options, policies]
  );

  const bulkPreview = useMemo(() => {
    if (mode !== "bulk") return [];
    const count = Math.min(50, Math.max(1, bulkCount || 1));
    return buildBulkRoomNames(
      bulkNaming,
      bulkNaming === "number_only" ? "" : namePrefix,
      startNumber || 1,
      count
    );
  }, [mode, bulkNaming, namePrefix, startNumber, bulkCount]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "single" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
        >
          {tRooms("singleRoom")}
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "bulk" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
        >
          {tRooms("bulkMany")}
        </button>
      </div>

      <AdminPendingForm action={createRoomAction} className="space-y-5">
        <input type="hidden" name="create_mode" value={mode} />
        {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

        <label className="block">
          <span className="text-sm font-medium">{tCommon("building")} *</span>
          <select
            name="building_id"
            required
            value={buildingId}
            onChange={(e) => {
              setBuildingId(e.target.value);
              setFloorId("");
            }}
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
          <span className="text-sm font-medium">{tRooms("floorOptional")}</span>
          <select
            name="floor_id"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
          >
            <option value="">{tRooms("withoutFloor")}</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">{tRooms("roomTypeRequired")}</span>
          <select
            name="room_type_definition_id"
            required
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.capacity_base} {tCommon("personsShort")}
                {t.base_price_per_night > 0 ? ` · ${t.base_price_per_night} RON` : ""}
              </option>
            ))}
          </select>
        </label>

        {mode === "single" ? (
          <label className="block">
            <span className="text-sm font-medium">{tRooms("roomNameRequired")}</span>
            <input
              name="name"
              required
              placeholder={tRooms("roomNamePlaceholder")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-900">
                {tRooms("bulkNamingLegend")}
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="bulk_naming_mode"
                  value="prefix"
                  checked={bulkNaming === "prefix"}
                  onChange={() => setBulkNaming("prefix")}
                />
                {tRooms("bulkNamingPrefix")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="bulk_naming_mode"
                  value="number_only"
                  checked={bulkNaming === "number_only"}
                  onChange={() => setBulkNaming("number_only")}
                />
                {tRooms("bulkNamingNumbersOnly")}
              </label>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              {bulkNaming === "prefix" ? (
                <label className="block sm:col-span-1">
                  <span className="text-sm font-medium">{tRooms("namePrefixRequired")}</span>
                  <input
                    name="name_prefix"
                    required
                    value={namePrefix}
                    onChange={(e) => setNamePrefix(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>
              ) : (
                <input type="hidden" name="name_prefix" value="" />
              )}
              <label className="block">
                <span className="text-sm font-medium">{tRooms("startNumber")}</span>
                <input
                  name="start_number"
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={(e) => setStartNumber(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{tRooms("howManyRooms")}</span>
                <input
                  name="bulk_count"
                  type="number"
                  min={1}
                  max={50}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
            </div>
            {bulkPreview.length > 0 && (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <span className="font-semibold">{tRooms("bulkPreviewLabel")}: </span>
                {bulkPreview.join(", ")}
                {bulkPreview.length >= 12 && bulkCount > 12 ? " …" : ""}
              </p>
            )}
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
            <span className="text-sm font-medium">{tRooms("pricePerNightRon")}</span>
            <span className="block text-xs text-zinc-500">
              {tRooms("autoPriceHint", { suggestedPrice })}
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
            <span className="text-sm font-medium">{tCommon("displayOrder")}</span>
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
          <span className="text-sm">{tRooms("allowExtraBeds")}</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">{tRooms("maxExtraBeds")}</span>
          <input
            name="max_extra_beds_per_room"
            type="number"
            min={0}
            max={4}
            defaultValue={1}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <AdminSubmitButton className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {mode === "bulk" ? tRooms("createRooms") : tRooms("saveRoom")}
        </AdminSubmitButton>
      </AdminPendingForm>
    </div>
  );
}
