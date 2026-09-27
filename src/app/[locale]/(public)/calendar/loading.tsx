import { PublicCalendarSkeleton } from "@/components/public/PublicPageSkeleton";
import { getTranslations } from "next-intl/server";

export default async function CalendarLoading() {
  const t = await getTranslations("common");
  return (
    <div aria-busy="true" aria-label={t("loading")}>
      <PublicCalendarSkeleton />
    </div>
  );
}
