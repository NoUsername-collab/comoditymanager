"use client";

import { useTranslations } from "next-intl";
import type { RoomDashboard } from "@/services/room-dashboard";
import { getBuildingTheme } from "@/lib/building-theme";
import { AC_LABELS, ROOM_STATUS, occupancyCaption } from "@/lib/admin-ui";
import { OccupancyRow } from "@/components/admin/ui/OccupancyRow";
import { StayBlock } from "@/components/admin/ui/StayBlock";
import { RoomManageActions } from "@/components/admin/rooms/RoomManageActions";

export function RoomDashboardCard({ room }: { room: RoomDashboard }) {
  const tCommon = useTranslations("admin.common");
  const tRooms = useTranslations("admin.rooms");
  const theme = getBuildingTheme(room.building_ac_mode, room.building_name);
  const st = ROOM_STATUS[room.status_on_date];

  const datePct =
    room.status_on_date === "occupied" || room.status_on_date === "pending"
      ? 100
      : 0;

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border shadow-sm",
        theme.border,
      ].join(" ")}
    >
      <div
        className={["px-5 py-4", theme.headerBg].join(" ")}
        style={{ borderBottom: `2px solid ${theme.accent}` }}
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900">{room.name}</h2>
              {!room.is_active && (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                  {tCommon("inactive")}
                </span>
              )}
              <span
                className={[
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  st.pill,
                ].join(" ")}
              >
                {st.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              <span
                className="mr-1.5 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
              {room.building_name}
              {room.floor_name ? ` · ${room.floor_name}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {AC_LABELS[room.building_ac_mode]} · {theme.label}
            </p>
          </div>
        </header>

        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span>
            <strong className="text-zinc-800">{room.capacity_base}</strong> {tCommon("personsShort")}
          </span>
          <span>{room.has_ac ? tCommon("ac") : tCommon("withoutAc")}</span>
          <span>{room.price_per_night} {tCommon("ronPerNight")}</span>
          {room.allows_extra_beds && (
            <span className="text-zinc-500">{tRooms("extraBed")}</span>
          )}
        </div>
      </div>

      <div className="space-y-2 px-5 py-4">
        <OccupancyRow
          label={room.view_date_label}
          pct={datePct}
          accent={theme.accent}
          barTrack={theme.barBg}
          caption={
            room.status_on_date === "occupied"
              ? room.guest_on_date ?? room.current_stay?.guest_name ?? tCommon("occupied")
              : room.status_on_date === "pending"
                ? room.guest_on_date ?? tCommon("request")
                : room.status_on_date === "inactive"
                  ? tCommon("inactive")
                  : tCommon("free")
          }
        />
        <OccupancyRow
          label={tCommon("sevenDays")}
          pct={room.week_occupancy_pct}
          accent={theme.accent}
          barTrack={theme.barBg}
          caption={occupancyCaption(room.week_occupancy_pct)}
        />
        <OccupancyRow
          label={tCommon("currentMonth")}
          pct={room.month_occupancy_pct}
          accent={theme.accent}
          barTrack={theme.barBg}
          caption={occupancyCaption(room.month_occupancy_pct)}
        />
      </div>

      <div className="space-y-3 px-5 pb-5">
        <StayBlock
          title={room.view_date_label}
          stay={room.current_stay}
          empty={tRooms("freeNoGuestOnDate", { date: room.view_date_label.toLowerCase() })}
        />
        <StayBlock
          title={tRooms("nextStay")}
          stay={room.next_stay}
          empty={tRooms("noNextBooking")}
          muted
        />

        <div className="border-t border-zinc-100 pt-3">
          <RoomManageActions
            roomId={room.id}
            roomName={room.name}
            isActive={room.is_active}
            buildingId={room.building_id}
            editHref={`/admin/rooms/${room.id}/edit`}
          />
        </div>
      </div>
    </article>
  );
}
