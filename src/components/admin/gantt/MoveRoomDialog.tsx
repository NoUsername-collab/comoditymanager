"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  moveBookingRoomFromPivotAction,
  previewRoomMoveAction,
} from "@/features/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";
import { formatStayPeriod } from "@/lib/ro-calendar";

type RoomOption = { id: string; name: string; building_name: string };

export type MoveRoomDraft = {
  bookingId: string;
  guestName: string;
  sourceRoomId: string;
  sourceRoomName: string;
  roomIds: string[];
};

type Props = {
  draft: MoveRoomDraft | null;
  rooms: RoomOption[];
  onClose: () => void;
};

export function MoveRoomDialog({ draft, rooms, onClose }: Props) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const { notifyMoved } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const [targetRoomId, setTargetRoomId] = useState("");
  const [previewState, setPreviewState] = useState<{
    roomId: string;
    text: string | null;
    error: string | null;
  }>({
    roomId: "",
    text: null,
    error: null,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft || !targetRoomId || targetRoomId === draft.sourceRoomId) {
      return;
    }
    let cancelled = false;
    void previewRoomMoveAction({
      bookingId: draft.bookingId,
      sourceRoomId: draft.sourceRoomId,
      targetRoomId,
    }).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setPreviewState({
          roomId: targetRoomId,
          text: null,
          error: res.error,
        });
        return;
      }
      const p = res.preview;
      setPreviewState({
        roomId: targetRoomId,
        error: null,
        text:
          p.mode === "full"
            ? `${draft.sourceRoomName} → ${rooms.find((r) => r.id === targetRoomId)?.name ?? tCommon("room")} · ` +
              `${formatStayPeriod(p.targetSegment.start, p.targetSegment.end, locale, true)} · ` +
              `${tCommon("total")}: ${p.oldTotal} → ${p.newTotal} RON`
            : `${draft.sourceRoomName}: ${formatStayPeriod(p.sourceSegment?.start ?? "", p.sourceSegment?.end ?? "", locale, true)} · ` +
              `→ ${rooms.find((r) => r.id === targetRoomId)?.name ?? tCommon("room")}: ${formatStayPeriod(p.targetSegment.start, p.targetSegment.end, locale, true)} · ` +
              `${tCommon("total")}: ${p.oldTotal} → ${p.newTotal} RON`,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [draft, targetRoomId, rooms]);

  if (!draft) return null;

  const targets = rooms.filter(
    (r) => r.id !== draft.sourceRoomId && !draft.roomIds.includes(r.id)
  );
  const previewText =
    previewState.roomId === targetRoomId ? previewState.text : null;
  const error =
    submitError ?? (previewState.roomId === targetRoomId ? previewState.error : null);

  function submit() {
    if (!draft) return;
    const current = draft;
    if (!targetRoomId) {
      setSubmitError(tGantt("moveRoom.chooseTarget"));
      return;
    }
    setSubmitError(null);
    void runAdminAction(async () => {
      const res = await moveBookingRoomFromPivotAction({
        bookingId: current.bookingId,
        sourceRoomId: current.sourceRoomId,
        targetRoomId,
      });
      if (!res.ok) {
        setSubmitError(res.error);
        return;
      }
      notifyMoved(tGantt("moveRoom.moved"), tGantt("moveRoom.updated", { guestName: current.guestName }));
      onClose();
      router.refresh();
    });
  }

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={tGantt("moveRoom.title")}
      variant="modal"
      width={440}
    >
      <div className="gantt-move-room space-y-3">
        <p className="text-sm text-zinc-600">
          <strong>{draft.guestName}</strong>
          <br />
          {tGantt.rich("moveRoom.introHtml", { room: () => <strong>{draft.sourceRoomName}</strong> })}
        </p>

        <label className="block text-xs font-semibold text-zinc-600">
          {tGantt("moveRoom.targetRoom")}
          <AdminSelect
            fieldSize="sm"
            className="mt-1"
            value={targetRoomId}
            onChange={(e) => {
              setTargetRoomId(e.target.value);
              setSubmitError(null);
            }}
          >
            <option value="">{tCommon("selectPlaceholder")}</option>
            {targets.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.building_name}
              </option>
            ))}
          </AdminSelect>
        </label>

        {previewText ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            {previewText}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <AdminButton
          variant="primary"
          fullWidth
          disabled={pending || !targetRoomId}
          onClick={submit}
        >
          {tGantt("moveRoom.confirm")}
        </AdminButton>
        <AdminButton variant="secondary" fullWidth onClick={onClose}>
          {tCommon("cancel")}
        </AdminButton>
      </div>
    </AdminFloatingPanel>
  );
}
