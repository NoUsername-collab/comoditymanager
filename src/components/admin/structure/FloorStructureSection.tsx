"use client";

import { useActionState, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { StructureFloor } from "@/services/location-structure";
import {
  updateFloorFormAction,
  type FloorFormState,
} from "@/app/[locale]/admin/(panel)/buildings/actions";
import { deleteFloorAction } from "@/app/[locale]/admin/(panel)/buildings/actions";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { DeleteConfirmButton } from "@/components/admin/DeleteConfirmButton";
import { RoomStructureRow } from "./RoomStructureRow";

export function FloorStructureSection({
  floor,
  buildingId,
  allFloors,
}: {
  floor: StructureFloor;
  buildingId: string;
  allFloors: StructureFloor[];
}) {
  const t = useTranslations("admin.locationStructure");
  const tCommon = useTranslations("admin.common");
  const tActions = useTranslations("admin.serverActions");
  const tFloor = useTranslations("admin.addFloorForm");
  const [editing, setEditing] = useState(false);
  const runAdminAction = useRunAdminAction();
  const [state, dispatch] = useActionState(updateFloorFormAction, null as FloorFormState);

  useEffect(() => {
    if (!state?.ok) return;
    const tmr = window.setTimeout(() => setEditing(false), 800);
    return () => window.clearTimeout(tmr);
  }, [state?.ok]);

  const feedback =
    state?.messageKey === "floorUpdated"
      ? tActions("floorUpdated")
      : state?.messageKey === "floorDuplicate"
        ? tActions("floorDuplicate")
        : state?.message;

  return (
    <section
      className={[
        "rounded-xl border p-3",
        floor.duplicateName
          ? "border-amber-300 bg-amber-50/60"
          : "border-zinc-200/90 bg-zinc-50/40",
      ].join(" ")}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-800">{floor.name}</h3>
          {floor.duplicateName && (
            <p className="mt-0.5 text-xs font-medium text-amber-900">
              {t("duplicateFloorHint")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-semibold text-zinc-600 underline hover:text-zinc-900"
          >
            {editing ? tCommon("cancel") : tCommon("edit")}
          </button>
          <Link
            href={`/admin/rooms/new?building=${buildingId}&floor=${floor.id}&return_to=structure`}
            className="text-xs font-semibold text-zinc-600 underline hover:text-zinc-900"
          >
            + {t("addRoomOnFloor")}
          </Link>
        </div>
      </div>

      {editing && (
        <div className="mb-3 rounded-lg border border-zinc-200 bg-white p-3">
          {feedback && (
            <p
              role="status"
              className={[
                "mb-2 rounded-lg px-3 py-2 text-sm",
                state?.ok
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border border-red-200 bg-red-50 text-red-800",
              ].join(" ")}
            >
              {feedback}
            </p>
          )}
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => runAdminAction(() => dispatch(formData))}
          >
            <input type="hidden" name="floor_id" value={floor.id} />
            <label className="flex flex-col text-sm">
              {tFloor("newFloor")}
              <input
                name="name"
                required
                defaultValue={floor.name}
                className="mt-1 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              {tFloor("levelNumber")}
              <input
                name="level_number"
                type="number"
                defaultValue={floor.level_number ?? ""}
                className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              {tCommon("displayOrder")}
              <input
                name="sort_order"
                type="number"
                defaultValue={floor.sort_order}
                className="mt-1 w-16 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <AdminSubmitButton className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50">
              {t("saveFloor")}
            </AdminSubmitButton>
          </form>
          <div className="mt-3 border-t border-zinc-100 pt-2">
            <DeleteConfirmButton
              label={t("deleteFloor")}
              confirmMessage={t("deleteFloorConfirm", {
                name: floor.name,
                count: floor.rooms.length,
              })}
              formAction={deleteFloorAction}
              hiddenFields={{ floor_id: floor.id }}
            />
          </div>
        </div>
      )}

      {floor.rooms.length === 0 ? (
        <p className="text-xs text-zinc-400">{t("noRoomsOnFloor")}</p>
      ) : (
        <ul className="space-y-1.5">
          {floor.rooms.map((room) => (
            <RoomStructureRow key={room.id} room={room} floors={allFloors} />
          ))}
        </ul>
      )}
    </section>
  );
}
