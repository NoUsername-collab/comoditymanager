"use client";

import type { AcMode } from "@/types/database";
import type { RoomOptionDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { useState } from "react";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { updateBuildingPoliciesAction } from "@/app/admin/(panel)/buildings/actions";

const POLICY_OPTIONS: { value: OptionPolicyMode; label: string }[] = [
  { value: "all_rooms", label: "Toate camerele" },
  { value: "none", label: "Niciuna" },
  { value: "per_room", label: "Per cameră" },
];

export function BuildingPoliciesForm({
  buildingId,
  buildingName,
  acMode: initialAcMode,
  options,
  policies,
}: {
  buildingId: string;
  buildingName: string;
  acMode: AcMode;
  options: RoomOptionDefinition[];
  policies: { option_id: string; mode: OptionPolicyMode }[];
}) {
  const [open, setOpen] = useState(false);
  const [acMode, setAcMode] = useState(initialAcMode);
  const acOption = options.find((o) => o.slug === "ac");
  const otherOptions = options.filter((o) => o.slug !== "ac");

  function policyFor(optionId: string, fallback: OptionPolicyMode = "per_room") {
    return policies.find((p) => p.option_id === optionId)?.mode ?? fallback;
  }

  if (options.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-zinc-700 underline hover:text-zinc-900"
      >
        {open ? "Ascunde politici opțiuni" : "Editează politici AC / frigider…"}
      </button>

      {open && (
        <AdminPendingForm
          action={updateBuildingPoliciesAction}
          className="mt-3 space-y-3 rounded-lg border border-zinc-200 bg-white/80 p-3"
        >
          <input type="hidden" name="building_id" value={buildingId} />
          <p className="text-xs text-zinc-500">{buildingName}</p>

          <label className="block text-sm">
            <span className="font-medium">Politică AC</span>
            <select
              name="ac_mode"
              value={acMode}
              onChange={(e) => setAcMode(e.target.value as AcMode)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="all_rooms">Toate camerele</option>
              <option value="none">Fără AC</option>
              <option value="per_room">Per cameră</option>
            </select>
          </label>

          {otherOptions.map((opt) => (
            <label key={opt.id} className="block text-sm">
              <span className="font-medium">{opt.name}</span>
              <select
                name={`policy_${opt.id}`}
                defaultValue={policyFor(opt.id)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {POLICY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {acOption && (
            <input type="hidden" name={`policy_${acOption.id}`} value={acMode} />
          )}

          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Salvează politici
          </button>
        </AdminPendingForm>
      )}
    </div>
  );
}
