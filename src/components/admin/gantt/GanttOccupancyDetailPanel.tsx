"use client";

import { useRouter } from "next/navigation";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  deleteRoomBlockAction,
  releaseRoomHoldAction,
} from "@/app/admin/(panel)/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { OccupancySegment } from "@/domain/occupancy/types";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { formatStayPeriod } from "@/lib/ro-calendar";

export type GanttOccDetail = {
  segment: OccupancySegment;
  roomName: string;
};

type Props = {
  detail: GanttOccDetail | null;
  onClose: () => void;
};

function formatExpiresAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GanttOccupancyDetailPanel({ detail, onClose }: Props) {
  const router = useRouter();
  const { showToast, notifyCancel } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  if (!detail) return null;

  const { segment, roomName } = detail;
  const period = formatStayPeriod(segment.checkIn, segment.checkOut, true);
  const isHold = segment.kind === "hold";
  const expiresLabel = isHold ? formatExpiresAt(segment.expiresAt) : null;

  function releaseOrDelete() {
    void runAdminAction(async () => {
      const res = isHold
        ? await releaseRoomHoldAction(segment.id)
        : await deleteRoomBlockAction(segment.id);
      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }
      notifyCancel(
        isHold ? "Hold eliberat" : "Blocare ștearsă",
        `${roomName} · ${period}`
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={isHold ? "Hold cameră" : "Blocare cameră"}
      variant="modal"
      width={400}
    >
      <div className="gantt-occ-detail space-y-3">
        <p className="text-sm text-zinc-600">
          <strong>{roomName}</strong>
          <br />
          {period}
        </p>

        {segment.reason?.trim() ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            {segment.reason}
          </p>
        ) : null}

        {expiresLabel ? (
          <p className="text-sm text-amber-800">
            Expiră: <strong>{expiresLabel}</strong>
          </p>
        ) : isHold ? (
          <p className="text-sm text-zinc-500">Fără expirare automată — eliberare manuală.</p>
        ) : null}

        <button
          type="button"
          className="admin-floating-panel__btn admin-floating-panel__btn--primary w-full"
          disabled={pending}
          onClick={releaseOrDelete}
        >
          {isHold ? "Eliberează hold" : "Șterge blocarea"}
        </button>

        <button type="button" className="admin-floating-panel__btn w-full" onClick={onClose}>
          Închide
        </button>
      </div>
    </AdminFloatingPanel>
  );
}
