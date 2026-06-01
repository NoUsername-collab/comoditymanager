"use client";

import { useTranslations } from "next-intl";
import {
  deleteRoomFromBuildingAction,
  setRoomActiveAction,
} from "@/app/[locale]/admin/(panel)/buildings/actions";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import {
  AdminTextActionButton,
  AdminTextActionLink,
} from "@/components/admin/ui/AdminTextAction";

type Props = {
  roomId: string;
  roomName: string;
  isActive: boolean;
  buildingId?: string;
  editHref?: string;
  className?: string;
};

/** Editează, dezactivează/activează și șterge — același comportament peste structură / camere / clădiri. */
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
        <AdminTextActionLink href={editHref} variant="neutral">
          {tCommon("edit")}
        </AdminTextActionLink>
      )}
      <form action={(formData) => runAdminAction(() => setRoomActiveAction(formData))}>
        <input type="hidden" name="room_id" value={roomId} />
        <input type="hidden" name="is_active" value={isActive ? "0" : "1"} />
        <AdminTextActionButton
          type="submit"
          variant={isActive ? "warning" : "primary"}
        >
          {isActive ? tStruct("deactivateRoom") : tStruct("activateRoom")}
        </AdminTextActionButton>
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
