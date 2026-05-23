"use client";

import { useState } from "react";
import Link from "next/link";
import type { BuildingDashboard } from "@/services/building-dashboard";
import type { BuildingTheme } from "@/lib/building-theme";
import { AC_LABELS, occupancyCaptionFromWindow } from "@/lib/admin-ui";
import { OccupancyRow } from "@/components/admin/ui/OccupancyRow";
import { AddFloorForm } from "@/app/admin/(panel)/buildings/add-floor-form";
import { BuildingRoomsCollapsible } from "./BuildingRoomsCollapsible";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
import { deleteBuildingAction } from "@/app/admin/(panel)/buildings/actions";
import { BuildingDefaultPriceForm } from "./BuildingDefaultPriceForm";

export function BuildingDashboardCardInteractive({
  data,
  theme,
}: {
  data: BuildingDashboard;
  theme: BuildingTheme;
}) {
  const { building } = data;
  const [bodyOpen, setBodyOpen] = useState(true);

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border shadow-md ring-1 ring-zinc-900/5",
        theme.border,
      ].join(" ")}
    >
      {/* Header — mereu vizibil */}
      <div
        className={[
          "sticky top-0 z-10 px-5 py-4 shadow-sm",
          theme.headerBg,
        ].join(" ")}
        style={{ borderBottom: `3px solid ${theme.accent}` }}
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/80"
                style={{ backgroundColor: theme.accent }}
              />
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                {building.name}
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {AC_LABELS[building.ac_mode]} ·{" "}
              <span className="text-zinc-500">{theme.label}</span>
            </p>
            <BuildingDefaultPriceForm
              buildingId={building.id}
              defaultPrice={building.default_price_per_night ?? 0}
            />
          </div>
          <Link
            href={`/admin/rooms/new?building=${building.id}`}
            className="shrink-0 rounded-lg border border-white/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-white hover:shadow"
          >
            + Cameră
          </Link>
        </header>

        <div className="mt-4 flex flex-wrap items-end gap-4 sm:gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Etaje
            </p>
            <p className="text-xl font-bold tabular-nums text-zinc-900">
              {data.floor_count}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Camere
            </p>
            <p className="text-xl font-bold tabular-nums text-zinc-900">
              {data.active_room_count}
              <span className="ml-1 text-xs font-medium text-zinc-500">
                active
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 pb-0.5">
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              {data.free_on_date} libere
            </span>
            <span className="status-occupied-pill rounded-full px-2.5 py-1 text-[11px] font-bold">
              {data.occupied_on_date} ocupate
            </span>
            {data.pending_on_date > 0 && (
              <span className="admin-cereri-glow rounded-full border border-red-300/80 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-800">
                {data.pending_on_date} cereri
              </span>
            )}
            <span className="rounded-full border border-zinc-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
              {data.view_date_label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBodyOpen((v) => !v)}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-left text-xs font-semibold text-zinc-700 backdrop-blur-sm transition hover:bg-white/80"
          aria-expanded={bodyOpen}
        >
          <span>
            {bodyOpen ? "Ascunde" : "Arată"} ocupare, camere & administrare
          </span>
          <span
            className={[
              "text-base text-zinc-500 transition-transform duration-200",
              bodyOpen && "rotate-180",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden
          >
            ▾
          </span>
        </button>
      </div>

      {/* Corp — colapsabil */}
      <div
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out",
          bodyOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-zinc-100/80 bg-white px-5 py-4">
            <OccupancyRow
              label={data.on_date.label}
              pct={data.on_date.occupancy_pct}
              accent={theme.accent}
              barTrack={theme.barBg}
              caption={occupancyCaptionFromWindow(data.on_date, true)}
            />
            <OccupancyRow
              label={data.week.label}
              pct={data.week.occupancy_pct}
              accent={theme.accent}
              barTrack={theme.barBg}
              caption={occupancyCaptionFromWindow(data.week)}
            />
            <OccupancyRow
              label={data.month.label}
              pct={data.month.occupancy_pct}
              accent={theme.accent}
              barTrack={theme.barBg}
              caption={occupancyCaptionFromWindow(data.month)}
            />
          </div>

          <div className="border-t border-zinc-100 bg-zinc-50/30 px-5 pb-5 pt-4">
            {data.floors.length > 0 && (
              <p className="mb-3 text-xs font-medium text-zinc-500">
                {data.floors.map((f) => f.name).join(" · ")}
              </p>
            )}

            <BuildingRoomsCollapsible
              rooms={data.rooms}
              buildingId={building.id}
              viewDateLabel={data.view_date_label}
              freeOnDate={data.free_on_date}
              occupiedOnDate={data.occupied_on_date}
              pendingOnDate={data.pending_on_date}
              hideSummary
            />

            <AddFloorForm buildingId={building.id} />

            <div className="mt-4 border-t border-zinc-200/80 pt-3">
              <DeleteConfirmButton
                label="Șterge clădirea"
                confirmMessage={`Ștergi „${building.name}”? Trebuie să nu mai aibă camere.`}
                formAction={deleteBuildingAction}
                hiddenFields={{ building_id: building.id }}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
