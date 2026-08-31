"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GanttCalendar } from "@/components/admin/GanttCalendar";
import { AdminGanttSkeleton } from "@/components/admin/loading/AdminGanttSkeleton";

const GanttCalendarDynamic = dynamic(
  () =>
    import("@/components/admin/GanttCalendar").then((m) => ({
      default: m.GanttCalendar,
    })),
  {
    ssr: false,
    loading: () => <AdminGanttSkeleton />,
  }
);

export function GanttCalendarLazy(
  props: ComponentProps<typeof GanttCalendar>
) {
  return <GanttCalendarDynamic {...props} />;
}
