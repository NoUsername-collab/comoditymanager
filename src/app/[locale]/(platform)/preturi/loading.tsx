import { PublicCardsSkeleton } from "@/components/public/PublicPageSkeleton";
import { getTranslations } from "next-intl/server";

export default async function PricingLoading() {
  const t = await getTranslations("common");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <PublicCardsSkeleton cards={3} />
    </div>
  );
}
