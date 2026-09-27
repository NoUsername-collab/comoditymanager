import { PublicHeroSkeleton, PublicCardsSkeleton } from "@/components/public/PublicPageSkeleton";
import { getTranslations } from "next-intl/server";

export default async function LandingLoading() {
  const t = await getTranslations("common");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <PublicHeroSkeleton />
      <PublicCardsSkeleton cards={8} />
      <PublicCardsSkeleton cards={3} />
    </div>
  );
}
