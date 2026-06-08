import { AdminListSkeleton } from "@/components/admin/loading/AdminListSkeleton";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.cazari");
  return (
    <AdminRetroPageFrame title={t("title")}>
      <AdminListSkeleton rows={8} />
    </AdminRetroPageFrame>
  );
}
