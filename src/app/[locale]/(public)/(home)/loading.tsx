import { PublicHeroSkeleton, PublicCardsSkeleton } from "@/components/public/PublicPageSkeleton";
import { getTranslations } from "next-intl/server";

/*
 * Only the first page streams behind this skeleton. It sits in its own group so
 * it does not wrap /<slug>: a loading boundary above a page commits the
 * response to 200 before the page can say the address does not exist.
 */
export default async function PublicHomeLoading() {
  const t = await getTranslations("common");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <PublicHeroSkeleton />
      <PublicCardsSkeleton cards={4} />
    </div>
  );
}
