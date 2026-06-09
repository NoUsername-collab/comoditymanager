import { AdminAvailabilitySkeleton } from "@/components/admin/loading/AdminAvailabilitySkeleton";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.disponibilitate");
  return (
    <AdminRetroPageFrame
      title={t("title")}
      description={t("description")}
      className="mx-auto max-w-[1600px]"
    >
      <AdminAvailabilitySkeleton />
    </AdminRetroPageFrame>
  );
}
