"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createFloorFormAction,
  type FloorFormState,
} from "./actions";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

export function AddFloorForm({
  buildingId,
  nextSortOrder = 1,
}: {
  buildingId: string;
  nextSortOrder?: number;
}) {
  const tCommon = useTranslations("admin.common");
  const tFloor = useTranslations("admin.addFloorForm");
  const tActions = useTranslations("admin.serverActions");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const runAdminAction = useRunAdminAction();
  const [state, dispatch] = useActionState(createFloorFormAction, null as FloorFormState);

  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    const t = window.setTimeout(() => setOpen(false), 1200);
    return () => window.clearTimeout(t);
  }, [state?.ok]);

  const feedback =
    state?.messageKey === "floorCreated"
      ? tActions("floorCreated")
      : state?.messageKey === "floorDuplicate"
        ? tActions("floorDuplicate")
        : state?.message;

  return (
    <div className="add-floor-form rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="add-floor-form__trigger flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100/60"
        aria-expanded={open}
      >
        <span>{tCommon("addFloor")}</span>
        <span className="text-zinc-400" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="add-floor-form__body border-t border-dashed border-zinc-200 px-4 pb-4 pt-3">
          {feedback && (
            <p
              role="status"
              className={[
                "mb-3 rounded-lg px-3 py-2 text-sm",
                state?.ok
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border border-red-200 bg-red-50 text-red-800",
              ].join(" ")}
            >
              {feedback}
            </p>
          )}

          <form
            ref={formRef}
            className="add-floor-form__fields flex flex-wrap items-end gap-2"
            action={(formData) => runAdminAction(() => dispatch(formData))}
          >
            <input type="hidden" name="building_id" value={buildingId} />
            <label className="flex flex-col text-sm">
              {tFloor("newFloor")}
              <input
                name="name"
                required
                placeholder={tCommon("floorPlaceholder")}
                className="mt-1 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              {tFloor("levelNumber")}
              <input
                name="level_number"
                type="number"
                placeholder="0"
                className="mt-1 w-20 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              {tCommon("displayOrder")}
              <input
                name="sort_order"
                type="number"
                defaultValue={nextSortOrder}
                className="mt-1 w-16 rounded border border-zinc-300 px-2 py-1"
              />
            </label>
            <AdminSubmitButton className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50">
              + {tFloor("floor")}
            </AdminSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
