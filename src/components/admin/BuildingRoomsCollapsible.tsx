"use client";

import { useState } from "react";
import Link from "next/link";
import type { BuildingRoomRow } from "@/services/building-dashboard";
import { RoomGridTile } from "@/components/admin/ui/RoomGridTile";
import { RoomAvailabilityGrid } from "@/components/admin/ui/RoomAvailabilityGrid";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
import { deleteRoomFromBuildingAction } from "@/app/admin/(panel)/buildings/actions";

export function BuildingRoomsCollapsible({
  rooms,
  buildingId,
  viewDateLabel,
  freeOnDate,
  occupiedOnDate,
  pendingOnDate,
  hideSummary = false,
}: {
  rooms: BuildingRoomRow[];
  buildingId: string;
  viewDateLabel: string;
  freeOnDate: number;
  occupiedOnDate: number;
  pendingOnDate: number;
  /** Sumarul e deja în header-ul clădirii */
  hideSummary?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const active = rooms.filter((r) => r.is_active);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-left text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50/80"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>
            Camere · {active.length} active
            {rooms.length !== active.length && (
              <span className="ml-1 font-normal text-zinc-400">
                ({rooms.length} total)
              </span>
            )}
          </span>
          <span className="text-xs font-normal text-zinc-500">
            · {viewDateLabel}
          </span>
        </span>
        <span className="text-zinc-400" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {!hideSummary && (
            <p className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                {freeOnDate} libere
              </span>
              <span className="status-occupied-pill rounded-full px-2 py-0.5 text-[11px] font-bold">
                {occupiedOnDate} ocupate
              </span>
              {pendingOnDate > 0 && (
                <span className="admin-cereri-glow rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800">
                  {pendingOnDate} cereri
                </span>
              )}
            </p>
          )}

          {rooms.length === 0 ? (
            <p className="text-sm text-zinc-400">Nicio cameră — adaugă prima.</p>
          ) : (
            <RoomAvailabilityGrid>
              {rooms.map((room) => (
                <RoomGridTile
                  key={room.id}
                  id={room.id}
                  name={room.name}
                  floorName={room.floor_name}
                  isActive={room.is_active}
                  statusOnDate={room.status_on_date}
                  guestOnDate={room.guest_on_date}
                  dateLabel={viewDateLabel}
                />
              ))}
            </RoomAvailabilityGrid>
          )}

          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer font-medium text-zinc-600 hover:text-zinc-900">
              Listă detalii & ștergere
            </summary>
            <ul className="mt-2 space-y-1.5">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-100 px-2 py-1.5"
                >
                  <span>
                    {room.name}
                    {room.floor_name ? ` · ${room.floor_name}` : ""}
                  </span>
                  <span className="flex gap-2">
                    <Link
                      href={`/admin/rooms/${room.id}/edit`}
                      className="underline"
                    >
                      Edit
                    </Link>
                    <DeleteConfirmButton
                      label="Șterge"
                      confirmMessage={`Ștergi „${room.name}”?`}
                      formAction={deleteRoomFromBuildingAction}
                      hiddenFields={{
                        room_id: room.id,
                        building_id: buildingId,
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
