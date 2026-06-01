"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  deleteRoomFromBuildingAction,
  setRoomActiveAction,
} from "@/app/[locale]/admin/(panel)/buildings/actions";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

type Props = {
  roomId: string;
  roomName: string;
  isActive: boolean;
  buildingId?: string;
  editHref?: string;
  className?: string;
};

/** Editează, inactivează/activează și șterge — același comportament peste structură / camere / clădiri. */
export function RoomManageActions({
  roomId,
  roomName,
  isActive,
  buildingId,
  editHref,
  className = "",
}: Props) {
  const tStruct = useTranslations("admin.locationStructure");
  const tCommon = useTranslations("admin.common");
  const runAdminAction = useRunAdminAction();

  const hiddenFields: Record<string, string> = { room_id: roomId };
  if (buildingId) hiddenFields.building_id = buildingId;

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 ${className}`.trim()}
    >
      {editHref && (
        <Link
          href={editHref}
          className="font-semibold text-zinc-700 underline hover:text-zinc-900"
        >
          {tCommon("edit")}
        </Link>
      )}
      <form action={(formData) => runAdminAction(() => setRoomActiveAction(formData))}>
        <input type="hidden" name="room_id" value={roomId} />
        <input type="hidden" name="is_active" value={isActive ? "0" : "1"} />
        <button
          type="submit"
          className="font-semibold text-amber-800 underline hover:text-amber-950"
        >
          {isActive ? tStruct("deactivateRoom") : tStruct("activateRoom")}
        </button>
      </form>
      <DeleteConfirmButton
        label={tCommon("delete")}
        confirmMessage={tStruct("deleteRoomConfirm", { name: roomName })}
        formAction={deleteRoomFromBuildingAction}
        hiddenFields={hiddenFields}
      />
    </span>
  );
}
