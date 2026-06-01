"use client";

import { useTranslations } from "next-intl";
import type { StructureFloor, StructureRoom } from "@/services/location-structure";
import { assignRoomFloorAction } from "@/app/[locale]/admin/(panel)/buildings/actions";
import { RoomManageActions } from "@/components/admin/rooms/RoomManageActions";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

export function RoomStructureRow({
  room,
  floors,
}: {
  room: StructureRoom;
  floors: StructureFloor[];
}) {
  const t = useTranslations("admin.locationStructure");
  const tCommon = useTranslations("admin.common");
  const runAdminAction = useRunAdminAction();

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 text-sm">
      <span className="font-medium text-zinc-900">
        {room.name}
        {!room.is_active && (
          <span className="ml-2 text-xs font-normal text-zinc-400">
            ({tCommon("inactive")})
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>{t("capacityShort", { count: room.capacity_base })}</span>
        <form
          className="flex items-center gap-1"
          action={(formData) => runAdminAction(() => assignRoomFloorAction(formData))}
        >
          <input type="hidden" name="room_id" value={room.id} />
          <label className="sr-only" htmlFor={`floor-${room.id}`}>
            {t("assignFloor")}
          </label>
          <select
            id={`floor-${room.id}`}
            name="floor_id"
            defaultValue={room.floor_id ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="max-w-[9rem] rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-800"
          >
            <option value="">{t("noFloorOption")}</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </form>
        <RoomManageActions
          roomId={room.id}
          roomName={room.name}
          isActive={room.is_active}
          editHref={`/admin/rooms/${room.id}/edit?return_to=structure`}
        />
      </span>
    </li>
  );
}
