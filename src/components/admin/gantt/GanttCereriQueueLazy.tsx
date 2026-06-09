"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GanttCereriQueue } from "@/components/admin/gantt/GanttCereriQueue";

const GanttCereriQueueDynamic = dynamic(
  () =>
    import("@/components/admin/gantt/GanttCereriQueue").then((m) => ({
      default: m.GanttCereriQueue,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="gantt-cereri-queue-skeleton min-h-[3rem] animate-pulse rounded-lg border border-zinc-200 bg-zinc-50"
        aria-busy="true"
      />
    ),
  }
);

export function GanttCereriQueueLazy(
  props: ComponentProps<typeof GanttCereriQueue>
) {
  return <GanttCereriQueueDynamic {...props} />;
}
