"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GanttCalendar } from "@/components/admin/GanttCalendar";

const GanttCalendarDynamic = dynamic(
  () =>
    import("@/components/admin/GanttCalendar").then((m) => ({
      default: m.GanttCalendar,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="gantt-loading flex min-h-[18rem] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500"
        aria-busy="true"
        aria-live="polite"
      >
        …
      </div>
    ),
  }
);

export function GanttCalendarLazy(
  props: ComponentProps<typeof GanttCalendar>
) {
  return <GanttCalendarDynamic {...props} />;
}
