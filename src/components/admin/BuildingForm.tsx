"use client";

import { useState } from "react";
import type { AcMode } from "@/types/database";
import { ColorPalettePicker } from "@/components/admin/ColorPalettePicker";

export function BuildingForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [acMode, setAcMode] = useState<AcMode>("per_room");

  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Nume clădire *</span>
        <input
          name="name"
          required
          placeholder="ex. Clădire AC, Clădire fără AC"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Politică AC *</span>
        <select
          name="ac_mode"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={acMode}
          onChange={(e) => setAcMode(e.target.value as AcMode)}
        >
          <option value="all_rooms">
            Toată clădirea are AC (implicit la camere noi)
          </option>
          <option value="none">Fără AC (implicit la camere noi)</option>
          <option value="per_room">AC decis per cameră la creare</option>
        </select>
      </label>

      <ColorPalettePicker acMode={acMode} />

      <label className="block">
        <span className="text-sm font-medium">Preț implicit / noapte (RON)</span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          Camerele noi din această clădire preiau prețul; poți modifica per cameră ulterior.
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
        <span className="text-sm font-medium">Ordine afișare</span>
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
        Salvează clădirea
      </button>
    </form>
  );
}
