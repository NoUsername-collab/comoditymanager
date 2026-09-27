import { getTranslations } from "next-intl/server";

export default async function PlatformAdminLogsLoading() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-sm text-neutral-500">{t("loading")}</div>
    </div>
  );
}
