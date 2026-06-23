import { AdminListSkeleton } from "@/components/admin/loading/AdminListSkeleton";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.loading");
  return (
    <div
      className="admin-route-skeleton admin-route-skeleton--panel-home"
      aria-busy="true"
      aria-label={t("label")}
    >
      <div className="admin-route-skeleton__toolbar" />
      <AdminListSkeleton rows={4} />
    </div>
  );
}
