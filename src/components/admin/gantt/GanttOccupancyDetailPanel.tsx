"use client";

import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  deleteRoomBlockAction,
  releaseRoomHoldAction,
} from "@/app/[locale]/admin/(panel)/calendar/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { OccupancySegment } from "@/domain/occupancy/types";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminButton } from "@/components/admin/ui/AdminButton";
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
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  const router = useRouter();
  const { showToast, notifyCancel } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  if (!detail) return null;

  const { segment, roomName } = detail;
  const period = formatStayPeriod(segment.checkIn, segment.checkOut, locale, true);
  const isHold = segment.kind === "hold";
  const expiresLabel = isHold ? formatExpiresAt(segment.expiresAt) : null;

  function releaseOrDelete() {
    void runAdminAction(async () => {
      const res = isHold
        ? await releaseRoomHoldAction(segment.id)
        : await deleteRoomBlockAction(segment.id);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      notifyCancel(
        isHold ? tGantt("occupancy.holdReleased") : tGantt("occupancy.blockDeleted"),
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
      title={isHold ? tGantt("occupancy.holdRoom") : tGantt("occupancy.blockRoom")}
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
            {tGantt("occupancy.expires")}: <strong>{expiresLabel}</strong>
          </p>
        ) : isHold ? (
          <p className="text-sm text-zinc-500">{tGantt("occupancy.noAutoExpire")}</p>
        ) : null}

        <AdminButton
          variant="primary"
          fullWidth
          disabled={pending}
          onClick={releaseOrDelete}
        >
          {isHold ? tGantt("occupancy.releaseHold") : tGantt("occupancy.deleteBlock")}
        </AdminButton>

        <AdminButton variant="secondary" fullWidth onClick={onClose}>
          {tCommon("close")}
        </AdminButton>
      </div>
    </AdminFloatingPanel>
  );
}
