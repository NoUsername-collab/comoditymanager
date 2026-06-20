import { AdminListSkeleton } from "@/components/admin/loading/AdminListSkeleton";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.statistics");
  return (
    <AdminPageFrame title={t("title")}>
      <AdminListSkeleton rows={8} />
    </AdminPageFrame>
  );
}
