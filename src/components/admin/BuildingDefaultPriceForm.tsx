"use client";

import { updateBuildingDefaultPriceAction } from "@/app/[locale]/admin/(panel)/buildings/update-price-action";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";

export function BuildingDefaultPriceForm({
  buildingId,
  defaultPrice,
}: {
  buildingId: string;
  defaultPrice: number;
}) {
  return (
    <AdminPendingForm
      action={updateBuildingDefaultPriceAction}
      className="mt-3 flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="building_id" value={buildingId} />
      <label className="text-xs text-zinc-600">
        Preț implicit camere noi (RON/noapte)
        <AdminInput
          name="default_price_per_night"
          type="number"
          min={0}
          step={1}
          defaultValue={defaultPrice}
          fieldSize="sm"
          className="mt-1 w-28 tabular-nums"
        />
      </label>
      <AdminSubmitButton size="sm">
        Salvează
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}
