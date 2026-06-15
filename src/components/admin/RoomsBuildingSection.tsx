"use client";

import { useState } from "react";
import { AdminLinkButton } from "@/components/admin/ui/AdminLinkButton";
import { useTranslations } from "next-intl";
import type { RoomDashboard } from "@/services/room-dashboard";
import { getBuildingTheme } from "@/lib/building-theme";
import { AC_LABELS } from "@/lib/admin-ui";
import { RoomGridTile } from "@/components/admin/ui/RoomGridTile";
import { RoomAvailabilityGrid } from "@/components/admin/ui/RoomAvailabilityGrid";
import type { AcMode } from "@/types/database";
import { RoomManageActions } from "@/components/admin/rooms/RoomManageActions";

export function RoomsBuildingSection({
  buildingId,
  buildingName,
  acMode,
  rooms,
  viewDateLabel,
}: {
  buildingId: string;
  buildingName: string;
  acMode: AcMode;
  rooms: RoomDashboard[];
  viewDateLabel: string;
}) {
  const tCommon = useTranslations("admin.common");
  const tBuildings = useTranslations("admin.buildings");
  const [open, setOpen] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const theme = getBuildingTheme(acMode, buildingName);
  const active = rooms.filter((r) => r.is_active);

  return (
    <section
      className={[
        "rooms-building-section overflow-hidden rounded-xl border shadow-sm",
        theme.border,
      ].join(" ")}
    >
      <div
        className={["flex flex-wrap items-center justify-between gap-3 px-5 py-4", theme.headerBg].join(
          " "
        )}
        style={{ borderBottom: `2px solid ${theme.accent}` }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
            <h2 className="text-lg font-semibold text-zinc-900">{buildingName}</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {AC_LABELS[acMode]} · {active.length} {tCommon("activeRooms")}
          </p>
        </div>
        <AdminLinkButton
          href={`/admin/rooms/new?building=${buildingId}`}
          size="sm"
        >
          + {tCommon("room")}
        </AdminLinkButton>
      </div>

      <div className="px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-medium text-zinc-700"
        >
          <span>{tCommon("roomGridTitle")}</span>
          <span className="text-zinc-400">{open ? "▾" : "▸"}</span>
        </button>

        {open && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-zinc-500">{viewDateLabel}</p>
            <RoomAvailabilityGrid>
              {rooms.map((r) => (
                <RoomGridTile
                  key={r.id}
                  id={r.id}
                  name={r.name}
                  floorName={r.floor_name}
                  isActive={r.is_active}
                  statusOnDate={r.status_on_date}
                  guestOnDate={r.guest_on_date}
                  dateLabel={viewDateLabel}
                />
              ))}
            </RoomAvailabilityGrid>

            <details
              className="mt-4 text-xs text-zinc-500"
              open={listOpen}
              onToggle={(e) => setListOpen(e.currentTarget.open)}
            >
              <summary className="admin-disclosure-summary font-medium">
                {tBuildings("detailsAndDeleteList")}
              </summary>
              <ul className="mt-2 space-y-1.5">
                {rooms.map((room) => (
                  <li
                    key={room.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-100 bg-zinc-50/80 px-2 py-1.5"
                  >
                    <span className="text-zinc-800">
                      {room.name}
                      {!room.is_active && (
                        <span className="ml-1 text-zinc-400">({tCommon("inactive")})</span>
                      )}
                      {room.floor_name ? ` · ${room.floor_name}` : ""}
                    </span>
                    <RoomManageActions
                      roomId={room.id}
                      roomName={room.name}
                      isActive={room.is_active}
                      buildingId={buildingId}
                      editHref={`/admin/rooms/${room.id}/edit`}
                    />
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
