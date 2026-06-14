import { AdminThemeLoading } from "@/components/admin/loading/AdminThemeLoading";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("admin.pages.loading");
  return <AdminThemeLoading label={t("label")} />;
}
