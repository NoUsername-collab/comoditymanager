"use client";

import type { Building, Floor } from "@/types/database";
import type { RoomOptionDefinition, RoomTypeDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import { RoomOptionFields } from "@/features/rooms/ui/RoomOptionFields";

type RoomData = {
  id: string;
  building_id: string;
  floor_id: string | null;
  name: string;
  room_type_definition_id?: string | null;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  price_per_night: number;
  is_active: boolean;
  sort_order: number;
  enabled_option_ids?: string[];
};

type Props = {
  room: RoomData;
  buildings: Building[];
  floorsByBuilding: Record<string, Floor[]>;
  types: RoomTypeDefinition[];
  options: RoomOptionDefinition[];
  policiesByBuilding: Record<string, { option_id: string; mode: OptionPolicyMode }[]>;
  updateRoomAction: (formData: FormData) => Promise<void>;
  returnTo?: "structure";
};

export function RoomEditForm({
  room,
  buildings,
  floorsByBuilding,
  types,
  options,
  policiesByBuilding,
  updateRoomAction,
  returnTo,
}: Props) {
  const tCommon = useTranslations("admin.common");
  const tEdit = useTranslations("admin.roomEditForm");
  const [buildingId, setBuildingId] = useState(room.building_id);
  const [typeId, setTypeId] = useState(
    room.room_type_definition_id ?? types.find((t) => t.slug === "double")?.id ?? ""
  );
  const floors = floorsByBuilding[buildingId] ?? [];
  const policies = policiesByBuilding[buildingId] ?? [];
  const selectedType = types.find((t) => t.id === typeId) ?? null;

  return (
    <AdminPendingForm action={updateRoomAction} className="mt-5 space-y-4">
      <input type="hidden" name="id" value={room.id} />
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

      <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={room.is_active}
          className="rounded"
        />
        <span className="text-sm font-medium">{tEdit("roomActive")}</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tCommon("building")}</span>
        <AdminSelect
          name="building_id"
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          className="mt-1"
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </AdminSelect>
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tEdit("floor")}</span>
        <AdminSelect
          name="floor_id"
          defaultValue={room.floor_id ?? ""}
          className="mt-1"
        >
          <option value="">{tEdit("withoutFloor")}</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </AdminSelect>
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tEdit("roomType")}</span>
        <AdminSelect
          name="room_type_definition_id"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="mt-1"
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </AdminSelect>
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tCommon("name")}</span>
        <AdminInput
          name="name"
          defaultValue={room.name}
          required
          className="mt-1"
        />
      </label>

      <RoomOptionFields
        options={options}
        policies={policies}
        selectedType={selectedType}
        selectedOptionIds={room.enabled_option_ids ?? []}
      />

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">{tEdit("capacity")}</span>
          <AdminInput
            name="capacity_base"
            type="number"
            min={1}
            defaultValue={room.capacity_base}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{tEdit("pricePerNight")}</span>
          <AdminInput
            name="price_per_night"
            type="number"
            min={0}
            defaultValue={room.price_per_night}
            className="mt-1"
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="allows_extra_beds"
          defaultChecked={room.allows_extra_beds}
          className="rounded"
        />
        <span className="text-sm">{tEdit("extraBeds")}</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tEdit("maxExtraBeds")}</span>
        <AdminInput
          name="max_extra_beds_per_room"
          type="number"
          min={0}
          max={4}
          defaultValue={room.max_extra_beds_per_room}
          className="mt-1"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tCommon("displayOrder")}</span>
        <AdminInput
          name="sort_order"
          type="number"
          defaultValue={room.sort_order}
          className="mt-1"
        />
      </label>

      <AdminSubmitButton size="md">
        {tEdit("saveChanges")}
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}
