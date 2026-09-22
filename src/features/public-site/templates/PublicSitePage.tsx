import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { PublicSiteBody } from "@/features/public-site/templates/PublicSiteTemplates";
import { getTranslations } from "next-intl/server";

export async function PublicSitePage({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = await getTranslations("public.home");
  const checkTimesLabel = t("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });
  return (
    <PublicSiteBody
      config={config}
      locale={locale}
      checkTimesLabel={checkTimesLabel}
    />
  );
}
