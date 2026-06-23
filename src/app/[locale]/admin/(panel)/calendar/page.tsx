import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  CalendarGanttSection,
  type CalendarSearchParams,
} from "@/components/admin/calendar/CalendarGanttSection";
import { AdminGanttSkeleton } from "@/components/admin/loading/AdminGanttSkeleton";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearchParams>;
}) {
  const t = await getTranslations("admin.pages.calendar");

  return (
    <Suspense
      fallback={
        <AdminPageFrame
          title={t("ganttTitle")}
          className="gantt-calendar-page w-full max-w-none"
        >
          <AdminGanttSkeleton />
        </AdminPageFrame>
      }
    >
      <CalendarGanttSection searchParams={searchParams} />
    </Suspense>
  );
}
