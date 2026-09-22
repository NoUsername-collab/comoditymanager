"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import {
  BLOCK_REASON_PRESETS,
  resolveBlockReason,
  type BlockReasonPresetId,
} from "@/domain/gantt/block-reasons";
import { createRoomBlockFromGanttAction } from "@/features/calendar/actions";
import { showGanttCreateUndoToast } from "@/features/calendar/ui/gantt-create-undo";
import { publishGanttHoldOrBlock } from "@/lib/gantt/live-bookings";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  GANTT_QUICK_LABEL_CLASS,
  type GanttQuickCreateDraft,
} from "./types";

export function BlockBody({
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
  const [blockPreset, setBlockPreset] =
    useState<BlockReasonPresetId>("maintenance");
  const [blockCustom, setBlockCustom] = useState("");
  const hasMultiRoomDraft = (draft?.roomIds?.length ?? 0) > 1;

  const period =
    checkIn && checkOut && checkIn < checkOut
      ? formatStayPeriod(checkIn, checkOut, locale, true)
      : "";

  function submitBlock() {
    if (!roomId) {
      onError(tGantt("quick.errors.chooseRoom"));
      return;
    }
    if (intervalInvalid) {
      onError(tGantt("quick.errors.checkoutAfterCheckin"));
      return;
    }
    const resolvedReason = resolveBlockReason(blockPreset, blockCustom);
    if (!resolvedReason) {
      onError(tGantt("quick.errors.blockReasonRequired"));
      return;
    }
    onError(null);
    void runAdminAction(async () => {
      const res = await createRoomBlockFromGanttAction({
        roomId,
        checkIn,
        checkOut,
        reason: resolvedReason,
      });
      if (!res.ok) {
        onError(res.error);
        return;
      }
      if (res.undo) {
        showGanttCreateUndoToast(
          showToast,
          router,
          tGantt("quick.blockCreated"),
          period,
          res.undo,
          {
            actionLabel: tGantt("quick.undoAction"),
            undoneTitle: tGantt("quick.undoneTitle"),
            undoneMessage: tGantt("quick.undoneMessage"),
          }
        );
      } else {
        showToast({ kind: "success", title: tGantt("quick.blockCreated"), message: period });
      }
      publishGanttHoldOrBlock({
        ids: [res.id],
        kind: "block",
        roomIds: [roomId],
        checkIn,
        checkOut,
        reason: resolvedReason,
        today,
      });
      onClose();
    });
  }

  return (
    <>
      <label className={GANTT_QUICK_LABEL_CLASS}>
        {tGantt("quick.blockReasonLabel")}
        <AdminSelect
          className="mt-1"
          value={blockPreset}
          onChange={(e) =>
            setBlockPreset(e.target.value as BlockReasonPresetId)
          }
        >
          {BLOCK_REASON_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </AdminSelect>
      </label>
      {blockPreset === "other" || blockCustom ? (
        <label className={GANTT_QUICK_LABEL_CLASS}>
          {tGantt("quick.detailsLabel")}
          <AdminInput
            className="mt-1"
            value={blockCustom}
            onChange={(e) => setBlockCustom(e.target.value)}
            placeholder={tGantt("quick.shortDescription")}
          />
        </label>
      ) : null}
      <div className="gantt-quick-panel__actions flex gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          className="gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
          disabled={
            pending ||
            !roomId ||
            hasConflict ||
            hasMultiRoomDraft ||
            intervalInvalid
          }
          onClick={submitBlock}
        >
          {pending ? tCommon("saving") : tGantt("quick.createBlock")}
        </AdminButton>
      </div>
    </>
  );
}
