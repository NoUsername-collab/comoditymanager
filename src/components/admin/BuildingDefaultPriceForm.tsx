"use client";

import { updateBuildingDefaultPriceAction } from "@/app/[locale]/admin/(panel)/buildings/update-price-action";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

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
        <input
          name="default_price_per_night"
          type="number"
          min={0}
          step={1}
          defaultValue={defaultPrice}
          className="mt-1 block w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums"
        />
      </label>
      <AdminSubmitButton
        pendingLabel="…"
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
      >
        Salvează
      </AdminSubmitButton>
    </AdminPendingForm>
  );
}
