import { AdminGanttSkeleton } from "@/components/admin/loading/AdminGanttSkeleton";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.calendar");
  return (
    <AdminPageFrame
      title={t("ganttTitle")}
      className="gantt-calendar-page w-full max-w-none"
    >
      <AdminGanttSkeleton />
    </AdminPageFrame>
  );
}
