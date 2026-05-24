"use client";

import type { RoomOptionDefinition, RoomTypeDefinition } from "@/types/room-catalog";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import {
  createRoomOptionAction,
  createRoomTypeAction,
  updateRoomOptionAction,
  updateRoomTypeAction,
} from "@/app/admin/(panel)/settings/location/catalog/actions";

export function AdminRoomCatalogPanel({
  types,
  options,
  catalogError,
}: {
  types: RoomTypeDefinition[];
  options: RoomOptionDefinition[];
  catalogError: string | null;
}) {
  if (catalogError) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {catalogError}
        <span className="mt-1 block">
          Rulează migrarea{" "}
          <code className="text-xs">015_room_catalog.sql</code> în Supabase SQL
          Editor.
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Tipuri cameră</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Preț bază + capacitate. Opțiunile bifate se aplică implicit la camere
          noi.
        </p>
        <ul className="mt-4 space-y-3">
          {types.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <AdminPendingForm action={updateRoomTypeAction} className="space-y-3">
                <input type="hidden" name="id" value={t.id} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    Nume
                    <input name="name" defaultValue={t.name} required className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    Capacitate
                    <input name="capacity_base" type="number" min={1} defaultValue={t.capacity_base} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    Preț bază / noapte
                    <input name="base_price_per_night" type="number" min={0} defaultValue={t.base_price_per_night} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    Ordine
                    <input name="sort_order" type="number" defaultValue={t.sort_order} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                </div>
                {options.length > 0 && (
                  <fieldset className="text-sm">
                    <legend className="mb-1 font-medium">Opțiuni implicite</legend>
                    <div className="flex flex-wrap gap-3">
                      {options.map((o) => (
                        <label key={o.id} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            name="default_option_ids"
                            value={o.id}
                            defaultChecked={t.default_option_ids.includes(o.id)}
                          />
                          {o.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={t.is_active} />
                  Activ {t.is_system && <span className="text-zinc-400">(sistem)</span>}
                </label>
                <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white">
                  Salvează tip
                </button>
              </AdminPendingForm>
            </li>
          ))}
        </ul>

        <AdminPendingForm action={createRoomTypeAction} className="mt-4 space-y-3 rounded-xl border border-dashed border-zinc-300 p-4">
          <p className="text-sm font-medium">Tip custom nou</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              Nume
              <input name="name" placeholder="Family Suite" required className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Capacitate
              <input name="capacity_base" type="number" min={1} defaultValue={2} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Preț bază
              <input name="base_price_per_night" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Ordine
              <input name="sort_order" type="number" defaultValue={types.length + 1} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white">
            Adaugă tip
          </button>
        </AdminPendingForm>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">Opțiuni modulare</h3>
        <p className="mt-1 text-xs text-zinc-500">
          AC, frigider, etc. Supliment la preț. Politica per clădire se setează la
          crearea clădirii.
        </p>
        <ul className="mt-4 space-y-3">
          {options.map((o) => (
            <li key={o.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <AdminPendingForm action={updateRoomOptionAction} className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">
                    Nume
                    <input name="name" defaultValue={o.name} required className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    Supliment / noapte
                    <input name="price_per_night_addon" type="number" min={0} defaultValue={o.price_per_night_addon} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                  <label className="text-sm">
                    Ordine
                    <input name="sort_order" type="number" defaultValue={o.sort_order} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                  <label className="text-sm sm:col-span-2 lg:col-span-1">
                    Descriere
                    <input name="description" defaultValue={o.description ?? ""} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={o.is_active} />
                  Activ {o.is_system && <span className="text-zinc-400">(sistem · {o.slug})</span>}
                </label>
                <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white">
                  Salvează opțiune
                </button>
              </AdminPendingForm>
            </li>
          ))}
        </ul>

        <AdminPendingForm action={createRoomOptionAction} className="mt-4 space-y-3 rounded-xl border border-dashed border-zinc-300 p-4">
          <p className="text-sm font-medium">Opțiune custom nouă</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Nume
              <input name="name" placeholder="Balcon" required className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Supliment / noapte
              <input name="price_per_night_addon" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
            <label className="text-sm">
              Descriere
              <input name="description" className="mt-1 w-full rounded-lg border px-2 py-1.5" />
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white">
            Adaugă opțiune
          </button>
        </AdminPendingForm>
      </section>
    </div>
  );
}
