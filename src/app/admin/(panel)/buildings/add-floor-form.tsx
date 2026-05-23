"use client";

import { useState } from "react";
import { createFloorAction } from "./actions";

export function AddFloorForm({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100/60"
        aria-expanded={open}
      >
        <span>Adaugă etaj</span>
        <span className="text-zinc-400" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="border-t border-dashed border-zinc-200 px-4 pb-4 pt-3">
          <form
            action={createFloorAction}
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="building_id" value={buildingId} />
            <label className="flex flex-col text-sm">
              Etaj nou
              <input
                name="name"
                required
                placeholder="Parter / Etaj 1"
                className="mt-1 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              Nr. nivel
              <input
                name="level_number"
                type="number"
                placeholder="0"
                className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              Ordine
              <input
                name="sort_order"
                type="number"
                defaultValue={1}
                className="mt-1 w-16 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-white"
            >
              + Etaj
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
