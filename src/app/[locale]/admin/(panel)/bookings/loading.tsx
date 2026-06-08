import { AdminListSkeleton } from "@/components/admin/loading/AdminListSkeleton";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.bookings");
  return (
    <AdminRetroPageFrame title={t("title")} description={t("description")}>
      <AdminListSkeleton rows={5} />
    </AdminRetroPageFrame>
  );
}
