"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GanttRequestsQueue } from "@/features/calendar/ui/GanttRequestsQueue";

const GanttRequestsQueueDynamic = dynamic(
  () =>
    import("@/features/calendar/ui/GanttRequestsQueue").then((m) => ({
      default: m.GanttRequestsQueue,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="gantt-requests-queue-skeleton min-h-[3rem] animate-pulse rounded-lg border border-zinc-200 bg-zinc-50"
        aria-busy="true"
      />
    ),
  }
);

export function GanttRequestsQueueLazy(
  props: ComponentProps<typeof GanttRequestsQueue>
) {
  return <GanttRequestsQueueDynamic {...props} />;
}
