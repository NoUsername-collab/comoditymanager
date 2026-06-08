import { AdminGanttSkeleton } from "@/components/admin/loading/AdminGanttSkeleton";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.calendar");
  return (
    <AdminRetroPageFrame
      title={t("ganttTitle")}
      className="gantt-calendar-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
    >
      <AdminGanttSkeleton />
    </AdminRetroPageFrame>
  );
}
