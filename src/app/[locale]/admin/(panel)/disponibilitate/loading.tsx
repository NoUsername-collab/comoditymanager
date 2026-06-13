import { AdminAvailabilitySkeleton } from "@/components/admin/loading/AdminAvailabilitySkeleton";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.disponibilitate");
  return (
    <AdminPageFrame
      title={t("title")}
      description={t("description")}
      className="mx-auto max-w-[1600px]"
    >
      <AdminAvailabilitySkeleton />
    </AdminPageFrame>
  );
}
