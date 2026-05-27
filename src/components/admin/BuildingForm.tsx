"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AcMode } from "@/types/database";
import type { RoomOptionDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { ColorPalettePicker } from "@/components/admin/ColorPalettePicker";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";

export function BuildingForm({
  action,
  catalogOptions = [],
}: {
  action: (formData: FormData) => Promise<void>;
  catalogOptions?: RoomOptionDefinition[];
}) {
  const tCommon = useTranslations("admin.common");
  const tBuildings = useTranslations("admin.buildingsForm");
  const policyOptions: { value: OptionPolicyMode; label: string }[] = [
    { value: "all_rooms", label: tBuildings("policyAllRooms") },
    { value: "none", label: tBuildings("policyNone") },
    { value: "per_room", label: tBuildings("policyPerRoom") },
  ];
  const [acMode, setAcMode] = useState<AcMode>("per_room");
  const nonAcOptions = catalogOptions.filter((o) => o.slug !== "ac");

  return (
    <AdminPendingForm action={action} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-medium">{tBuildings("buildingNameRequired")}</span>
        <input
          name="name"
          required
          placeholder={tBuildings("buildingNamePlaceholder")}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{tBuildings("acPolicyRequired")}</span>
        <select
          name="ac_mode"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={acMode}
          onChange={(e) => setAcMode(e.target.value as AcMode)}
        >
          <option value="all_rooms">{tBuildings("acPolicyAllRooms")}</option>
          <option value="none">{tCommon("withoutAc")}</option>
          <option value="per_room">{tBuildings("acPolicyPerRoom")}</option>
        </select>
      </label>

      {nonAcOptions.length > 0 && (
        <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <legend className="px-1 text-sm font-medium">
            {tBuildings("optionPoliciesModular")}
          </legend>
          {nonAcOptions.map((opt) => (
            <label key={opt.id} className="block text-sm">
              <span className="font-medium">{opt.name}</span>
              <select
                name={`policy_${opt.id}`}
                defaultValue="per_room"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                {policyOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
      )}

      <ColorPalettePicker acMode={acMode} />

      <label className="block">
        <span className="text-sm font-medium">{tBuildings("defaultPricePerNightRon")}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          {tBuildings("defaultPriceHint")}
        </span>
        <input
          name="default_price_per_night"
          type="number"
          min={0}
          step={1}
          defaultValue={250}
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

      <button
        type="submit"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        {tBuildings("saveBuilding")}
      </button>
    </AdminPendingForm>
  );
}
