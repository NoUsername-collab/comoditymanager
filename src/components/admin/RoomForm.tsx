"use client";

import type { Building, Floor } from "@/types/database";
import type { RoomOptionDefinition, RoomTypeDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import {
  buildBulkRoomNames,
  findDuplicateRoomNames,
  suggestNextBulkStartNumber,
  type BulkNamingMode,
} from "@/domain/room/bulk-names";
import { roomScopeKey } from "@/domain/room/scope-key";
import { computeRoomPrice, policyModeForOption, resolveOptionEnabled } from "@/lib/room-catalog-pricing";
import { useEffect, useMemo, useState } from "react";
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
  existingNamesByScope?: Record<string, string[]>;
  nextSortByBuilding?: Record<string, number>;
  defaultBuildingId?: string;
  defaultFloorId?: string;
  returnTo?: "structure";
  formError?: string | null;
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
  existingNamesByScope = {},
  nextSortByBuilding = {},
  defaultBuildingId,
  defaultFloorId,
  returnTo,
  formError,
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
  const [bulkNaming, setBulkNaming] = useState<BulkNamingMode>("number_only");
  const [namePrefix, setNamePrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [endNumber, setEndNumber] = useState(10);
  const [sortOrder, setSortOrder] = useState(1);

  const building = buildings.find((b) => b.id === buildingId);
  const floors = floorsByBuilding[buildingId] ?? [];
  const policies = policiesByBuilding[buildingId] ?? [];
  const selectedType = types.find((t) => t.id === typeId) ?? null;

  const suggestedPrice = useMemo(
    () => suggestPrice(building, selectedType, options, policies),
    [building, selectedType, options, policies]
  );

  const existingNames = useMemo(
    () => existingNamesByScope[roomScopeKey(buildingId, floorId || null)] ?? [],
    [existingNamesByScope, buildingId, floorId]
  );

  useEffect(() => {
    const nextSort = nextSortByBuilding[buildingId] ?? 1;
    setSortOrder(nextSort);
    if (mode !== "bulk") return;
    const nextStart = suggestNextBulkStartNumber(
      existingNames,
      bulkNaming,
      bulkNaming === "number_only" ? "" : namePrefix
    );
    setStartNumber(nextStart);
    setEndNumber(nextStart + 9);
  }, [buildingId, floorId, mode, bulkNaming, namePrefix, existingNames, nextSortByBuilding]);

  const bulkCount = Math.max(1, (endNumber || startNumber) - startNumber + 1);

  const bulkPreview = useMemo(() => {
    if (mode !== "bulk") return [];
    const count = Math.min(50, Math.max(1, bulkCount));
    return buildBulkRoomNames(
      bulkNaming,
      bulkNaming === "number_only" ? "" : namePrefix,
      startNumber || 1,
      count
    );
  }, [mode, bulkNaming, namePrefix, startNumber, bulkCount]);

  const bulkConflicts = useMemo(() => {
    if (mode !== "bulk" || bulkPreview.length === 0) return [];
    return findDuplicateRoomNames(existingNames, bulkPreview);
  }, [mode, bulkPreview, existingNames]);

  const bulkBlocked = mode === "bulk" && bulkConflicts.length > 0;

  return (
    <div className="admin-room-form mt-4 space-y-3">
      {formError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError}
        </p>
      ) : null}
      <div className="admin-room-form__mode flex gap-2">
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

      <AdminPendingForm action={createRoomAction} className="admin-room-form__fields space-y-4">
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
              placeholder={tRooms("roomNamePlaceholderPlain")}
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
                  value="number_only"
                  checked={bulkNaming === "number_only"}
                  onChange={() => setBulkNaming("number_only")}
                />
                {tRooms("bulkNamingNumbersOnly")}
              </label>
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
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              {bulkNaming === "prefix" ? (
                <label className="block sm:col-span-1">
                  <span className="text-sm font-medium">{tRooms("namePrefixOptional")}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {tRooms("namePrefixEmptyHint")}
                  </span>
                  <input
                    name="name_prefix"
                    value={namePrefix}
                    onChange={(e) => setNamePrefix(e.target.value)}
                    placeholder={tRooms("namePrefixPlaceholder")}
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
                  onChange={(e) => {
                    const v = Number(e.target.value) || 1;
                    setStartNumber(v);
                    if (endNumber < v) setEndNumber(v);
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{tRooms("endNumber")}</span>
                <input
                  name="end_number"
                  type="number"
                  min={startNumber}
                  max={startNumber + 49}
                  value={endNumber}
                  onChange={(e) => setEndNumber(Number(e.target.value) || startNumber)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </label>
              <input type="hidden" name="bulk_count" value={bulkCount} />
            </div>
            {bulkPreview.length > 0 && (
              <div
                className={[
                  "rounded-lg border px-3 py-2 text-xs",
                  bulkConflicts.length > 0
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700",
                ].join(" ")}
              >
                <span className="font-semibold">{tRooms("bulkPreviewLabel")}: </span>
                {bulkPreview.join(", ")}
                {bulkPreview.length >= 50 ? " …" : ""}
                {bulkConflicts.length > 0 ? (
                  <p className="mt-1.5 font-semibold">
                    {tRooms("bulkConflictWarning", {
                      names: bulkConflicts.join(", "),
                    })}
                  </p>
                ) : (
                  <p className="mt-1.5 text-zinc-500">{tRooms("bulkAutoStartHint")}</p>
                )}
              </div>
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
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 1)}
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

        <AdminSubmitButton
          disabled={bulkBlocked}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {mode === "bulk" ? tRooms("createRooms") : tRooms("saveRoom")}
        </AdminSubmitButton>
      </AdminPendingForm>
    </div>
  );
}
