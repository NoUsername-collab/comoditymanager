"use client";

import type { AcMode } from "@/types/database";
import type { RoomOptionDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";
import { updateBuildingPoliciesAction } from "@/features/buildings/actions";
import { AdminTextActionButton } from "@/components/admin/ui/AdminTextAction";

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
  const tCommon = useTranslations("admin.common");
  const tPolicies = useTranslations("admin.buildingPoliciesForm");
  const policyOptions: { value: OptionPolicyMode; label: string }[] = [
    { value: "all_rooms", label: tPolicies("policyAllRooms") },
    { value: "none", label: tPolicies("policyNone") },
    { value: "per_room", label: tPolicies("policyPerRoom") },
  ];
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
      <AdminTextActionButton
        type="button"
        variant="neutral"
        className="text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? tPolicies("hideOptionPolicies") : tPolicies("editPoliciesAcFridge")}
      </AdminTextActionButton>

      {open && (
        <AdminPendingForm
          action={updateBuildingPoliciesAction}
          className="mt-3 space-y-3 rounded-lg border border-zinc-200 bg-white/80 p-3"
        >
          <input type="hidden" name="building_id" value={buildingId} />
          <p className="text-xs text-zinc-500">{buildingName}</p>

          <label className="block text-sm">
            <span className="font-medium">{tPolicies("acPolicy")}</span>
            <AdminSelect
              name="ac_mode"
              value={acMode}
              onChange={(e) => setAcMode(e.target.value as AcMode)}
              className="mt-1"
              fieldSize="sm"
            >
              <option value="all_rooms">{tPolicies("policyAllRooms")}</option>
              <option value="none">{tCommon("withoutAc")}</option>
              <option value="per_room">{tPolicies("policyPerRoom")}</option>
            </AdminSelect>
          </label>

          {otherOptions.map((opt) => (
            <label key={opt.id} className="block text-sm">
              <span className="font-medium">{opt.name}</span>
              <AdminSelect
                name={`policy_${opt.id}`}
                defaultValue={policyFor(opt.id)}
                className="mt-1"
                fieldSize="sm"
              >
                {policyOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </AdminSelect>
            </label>
          ))}

          {acOption && (
            <input type="hidden" name={`policy_${acOption.id}`} value={acMode} />
          )}

          <AdminSubmitButton size="sm">
            {tPolicies("savePolicies")}
          </AdminSubmitButton>
        </AdminPendingForm>
      )}
    </div>
  );
}
