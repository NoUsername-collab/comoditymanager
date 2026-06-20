import { AdminListSkeleton } from "@/components/admin/loading/AdminListSkeleton";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.settings");
  return (
    <div className="settings-loading" aria-busy="true" aria-label={t("navTitle")}>
      <div className="admin-route-skeleton__row mb-4 h-6 w-48" />
      <AdminListSkeleton rows={6} />
    </div>
  );
}
