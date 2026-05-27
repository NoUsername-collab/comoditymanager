"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";

export function GanttAvailabilityHeatmapPanel({
  open,
  closeHref,
  title,
  prevHref,
  nextHref,
  roomCountLabel,
  children,
}: {
  open: boolean;
  closeHref: string;
  title: string;
  prevHref: string;
  nextHref: string;
  roomCountLabel: string;
  children: React.ReactNode;
}) {
  const tCommon = useTranslations("admin.common");
  const router = useRouter();

  return (
    <AdminFloatingPanel
      open={open}
      onClose={() => router.push(closeHref)}
      title={tCommon("availabilityHeatmap")}
      variant="modal"
      width={1280}
      showBackdrop={false}
      className="gantt-heatmap-panel"
    >
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold capitalize text-zinc-900">{title}</p>
            <p className="mt-1 text-xs text-zinc-500">{roomCountLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
              onClick={() => router.push(prevHref)}
              aria-label={tCommon("previous")}
            >
              ←
            </button>
            <button
              type="button"
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium"
              onClick={() => router.push(nextHref)}
              aria-label={tCommon("next")}
            >
              →
            </button>
          </div>
        </div>

        {children}
      </div>
    </AdminFloatingPanel>
  );
}
