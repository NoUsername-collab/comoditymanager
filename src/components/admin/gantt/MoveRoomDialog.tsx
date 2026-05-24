"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  moveBookingRoomFromPivotAction,
  previewRoomMoveAction,
} from "@/app/admin/(panel)/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
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
  const router = useRouter();
  const { showToast, notifyMoved } = useAdminFx();
  const [pending, startTransition] = useTransition();
  const [targetRoomId, setTargetRoomId] = useState("");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setTargetRoomId("");
    setPreviewText(null);
    setError(null);
  }, [draft]);

  useEffect(() => {
    if (!draft || !targetRoomId || targetRoomId === draft.sourceRoomId) {
      setPreviewText(null);
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
        setPreviewText(null);
        setError(res.error);
        return;
      }
      setError(null);
      const p = res.preview;
      setPreviewText(
        `${draft.sourceRoomName}: ${formatStayPeriod(p.sourceSegment.start, p.sourceSegment.end, true)} · ` +
          `→ ${rooms.find((r) => r.id === targetRoomId)?.name ?? "cameră"}: ${formatStayPeriod(p.targetSegment.start, p.targetSegment.end, true)} · ` +
          `Total: ${p.oldTotal} → ${p.newTotal} RON`
      );
    });
    return () => {
      cancelled = true;
    };
  }, [draft, targetRoomId, rooms]);

  if (!draft) return null;

  const targets = rooms.filter(
    (r) => r.id !== draft.sourceRoomId && !draft.roomIds.includes(r.id)
  );

  function submit() {
    if (!draft) return;
    const current = draft;
    if (!targetRoomId) {
      setError("Alege camera țintă.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await moveBookingRoomFromPivotAction({
        bookingId: current.bookingId,
        sourceRoomId: current.sourceRoomId,
        targetRoomId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notifyMoved("Cameră mutată", `${current.guestName} — split de azi`);
      onClose();
      router.refresh();
    });
  }

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title="Mută cameră (de azi)"
      variant="modal"
      width={440}
    >
      <div className="gantt-move-room space-y-3">
        <p className="text-sm text-zinc-600">
          <strong>{draft.guestName}</strong>
          <br />
          Din <strong>{draft.sourceRoomName}</strong> — segmentul viitor merge în camera aleasă.
        </p>

        <label className="block text-xs font-semibold text-zinc-600">
          Camera țintă
          <select
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            value={targetRoomId}
            onChange={(e) => setTargetRoomId(e.target.value)}
          >
            <option value="">Selectează…</option>
            {targets.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.building_name}
              </option>
            ))}
          </select>
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

        <button
          type="button"
          className="admin-floating-panel__btn admin-floating-panel__btn--primary w-full"
          disabled={pending || !targetRoomId}
          onClick={submit}
        >
          Confirmă mutarea
        </button>
        <button type="button" className="admin-floating-panel__btn w-full" onClick={onClose}>
          Anulează
        </button>
      </div>
    </AdminFloatingPanel>
  );
}
