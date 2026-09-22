"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import {
  createRoomHoldFromGanttAction,
  createRoomHoldsFromGanttAction,
} from "@/features/calendar/actions";
import { showGanttCreateUndoToast } from "@/features/calendar/ui/gantt-create-undo";
import { publishGanttHoldOrBlock } from "@/lib/gantt/live-bookings";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  GANTT_QUICK_LABEL_CLASS,
  type GanttQuickCreateDraft,
} from "./types";

export function HoldBody({
  roomId,
  checkIn,
  checkOut,
  draft = null,
  hasConflict,
  intervalInvalid,
  pending,
  today,
  onClose,
  onError,
}: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  draft?: GanttQuickCreateDraft | null;
  hasConflict: boolean;
  intervalInvalid: boolean;
  pending: boolean;
  today: string;
  onClose: () => void;
  onError: (error: string | null) => void;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useAdminFx();
  const runAdminAction = useRunAdminAction();
  const [reason, setReason] = useState("");
  const [expiresHours, setExpiresHours] = useState("");

  const period =
    checkIn && checkOut && checkIn < checkOut
      ? formatStayPeriod(checkIn, checkOut, locale, true)
      : "";

  function submitHold() {
    if (!roomId) {
      onError(tGantt("quick.errors.chooseRoom"));
      return;
    }
    if (intervalInvalid) {
      onError(tGantt("quick.errors.checkoutAfterCheckin"));
      return;
    }
    onError(null);
    void runAdminAction(async () => {
      const hours = expiresHours.trim() ? Number(expiresHours) : null;
      const res =
        draft?.roomIds && draft.roomIds.length > 1
          ? await createRoomHoldsFromGanttAction({
              roomIds: draft.roomIds,
              checkIn,
              checkOut,
              reason,
              expiresHours: hours,
            })
          : await createRoomHoldFromGanttAction({
              roomId,
              checkIn,
              checkOut,
              reason,
              expiresHours: hours,
            });

      if (!res.ok) {
        onError(res.error);
        return;
      }

      if (res.undo) {
        showGanttCreateUndoToast(
          showToast,
          router,
          draft?.roomIds && draft.roomIds.length > 1
            ? tGantt("quick.holdCreatedMany", { count: draft.roomIds.length })
            : tGantt("quick.holdCreated"),
          period,
          res.undo,
          {
            actionLabel: tGantt("quick.undoAction"),
            undoneTitle: tGantt("quick.undoneTitle"),
            undoneMessage: tGantt("quick.undoneMessage"),
          }
        );
      } else {
        showToast({ kind: "success", title: tGantt("quick.holdCreated"), message: period });
      }
      const holdIds = "ids" in res ? res.ids : [res.id];
      const holdRoomIds =
        draft?.roomIds && draft.roomIds.length > 1 ? draft.roomIds : [roomId];
      publishGanttHoldOrBlock({
        ids: holdIds,
        kind: "hold",
        roomIds: holdRoomIds,
        checkIn,
        checkOut,
        reason,
        today,
      });
      onClose();
    });
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={GANTT_QUICK_LABEL_CLASS}>
          {tGantt("quick.reasonLabel")}
          <AdminInput
            className="mt-1"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tGantt("quick.holdReasonPlaceholder")}
          />
        </label>
        <label className={GANTT_QUICK_LABEL_CLASS}>
          {tGantt("quick.expiresAfterLabel")}
          <AdminInput
            type="number"
            min={1}
            className="mt-1"
            value={expiresHours}
            onChange={(e) => setExpiresHours(e.target.value)}
            placeholder={tGantt("quick.hoursOptionalPlaceholder")}
          />
        </label>
      </div>
      <div className="gantt-quick-panel__actions flex gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          className="gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
          disabled={pending || !roomId || hasConflict || intervalInvalid}
          onClick={submitHold}
        >
          {pending ? tCommon("saving") : tGantt("quick.createHold")}
        </AdminButton>
      </div>
    </>
  );
}
