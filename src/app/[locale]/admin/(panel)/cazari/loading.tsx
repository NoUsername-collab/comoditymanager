import { AdminListSkeleton } from "@/components/admin/loading/AdminListSkeleton";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const [t, tLoading] = await Promise.all([
    getTranslations("admin.pages.cazari"),
    getTranslations("admin.pages.loading"),
  ]);
  return (
    <AdminPageFrame title={t("title")}>
      <AdminListSkeleton rows={8} label={tLoading("label")} />
    </AdminPageFrame>
  );
}
