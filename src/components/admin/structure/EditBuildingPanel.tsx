"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Building } from "@/types/database";
import type { AcMode } from "@/types/database";
import {
  updateBuildingFormAction,
  type BuildingFormState,
} from "@/app/[locale]/admin/(panel)/buildings/actions";
import { deleteBuildingAction } from "@/app/[locale]/admin/(panel)/buildings/actions";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { AdminTextActionButton } from "@/components/admin/ui/AdminTextAction";
import { ColorPalettePicker } from "@/components/admin/ColorPalettePicker";

export function EditBuildingPanel({ building }: { building: Building }) {
  const t = useTranslations("admin.locationStructure");
  const tCommon = useTranslations("admin.common");
  const tBuildings = useTranslations("admin.buildingsForm");
  const tActions = useTranslations("admin.serverActions");
  const tBuildingsPage = useTranslations("admin.buildings");
  const [open, setOpen] = useState(false);
  const [acMode, setAcMode] = useState<AcMode>(building.ac_mode);
  const runAdminAction = useRunAdminAction();
  const [state, dispatch] = useActionState(
    updateBuildingFormAction,
    null as BuildingFormState
  );

  const initialColor = building.color_hex ?? null;

  const feedback =
    state?.messageKey === "buildingUpdated"
      ? tActions("buildingUpdated")
      : state?.message;

  return (
    <div className="mt-2">
      <AdminTextActionButton
        type="button"
        variant="neutral"
        className="text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t("hideBuildingEdit") : t("editBuilding")}
      </AdminTextActionButton>

      {open && (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white/80 p-4">
          {feedback && (
            <p
              role="status"
              className={[
                "mb-3 rounded-lg px-3 py-2 text-sm",
                state?.ok
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border border-red-200 bg-red-50 text-red-800",
              ].join(" ")}
            >
              {feedback}
            </p>
          )}

          <form
            className="space-y-3"
            action={(formData) => runAdminAction(() => dispatch(formData))}
          >
            <input type="hidden" name="building_id" value={building.id} />
            <label className="block text-sm">
              <span className="font-medium">{tBuildings("buildingNameRequired")}</span>
              <AdminInput
                name="name"
                required
                defaultValue={building.name}
                className="mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{tBuildings("acPolicyRequired")}</span>
              <AdminSelect
                name="ac_mode"
                value={acMode}
                onChange={(e) => setAcMode(e.target.value as AcMode)}
                className="mt-1"
              >
                <option value="all_rooms">{tBuildings("acPolicyAllRooms")}</option>
                <option value="none">{tCommon("withoutAc")}</option>
                <option value="per_room">{tBuildings("acPolicyPerRoom")}</option>
              </AdminSelect>
            </label>
            <ColorPalettePicker
              key={building.id}
              acMode={acMode}
              defaultValue={initialColor}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">{tBuildings("defaultPricePerNightRon")}</span>
                <AdminInput
                  name="default_price_per_night"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={building.default_price_per_night ?? 0}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">{tCommon("displayOrder")}</span>
                <AdminInput
                  name="sort_order"
                  type="number"
                  defaultValue={building.sort_order}
                  className="mt-1"
                />
              </label>
            </div>
            <AdminSubmitButton size="md">
              {t("saveBuilding")}
            </AdminSubmitButton>
          </form>

          <div className="mt-4 border-t border-zinc-200 pt-3">
            <DeleteConfirmButton
              label={tCommon("deleteBuilding")}
              confirmMessage={tBuildingsPage("deleteBuildingConfirm", {
                name: building.name,
              })}
              formAction={deleteBuildingAction}
              hiddenFields={{ building_id: building.id }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
