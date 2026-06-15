"use client";

import { useTranslations } from "next-intl";
import type { StructureFloor, StructureRoom } from "@/services/location-structure";
import { assignRoomFloorAction } from "@/app/[locale]/admin/(panel)/buildings/actions";
import { RoomManageActions } from "@/components/admin/rooms/RoomManageActions";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminSelect } from "@/components/admin/ui/AdminInput";

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
    <li className="room-structure-row flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-white px-3 py-2 text-sm">
      <span className="font-medium text-zinc-900">
        {room.name}
        {!room.is_active && (
          <span className="ml-2 text-xs font-normal text-zinc-400">
            ({tCommon("inactive")})
          </span>
        )}
      </span>
      <span className="room-structure-row__controls flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>{t("capacityShort", { count: room.capacity_base })}</span>
        <form
          className="flex items-center gap-1"
          action={(formData) => runAdminAction(() => assignRoomFloorAction(formData))}
        >
          <input type="hidden" name="room_id" value={room.id} />
          <label className="sr-only" htmlFor={`floor-${room.id}`}>
            {t("assignFloor")}
          </label>
          <AdminSelect
            id={`floor-${room.id}`}
            name="floor_id"
            defaultValue={room.floor_id ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            fieldSize="sm"
            className="room-structure-row__floor-select max-w-[9rem]"
          >
            <option value="">{t("noFloorOption")}</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </AdminSelect>
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
