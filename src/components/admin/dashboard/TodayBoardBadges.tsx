import { getTranslations } from "next-intl/server";

export async function TodayBoardBadges({
  arrivals,
  departures,
  toClean,
}: {
  arrivals: number;
  departures: number;
  toClean: number;
}) {
  const t = await getTranslations("admin.common");

  return (
    <div className="admin-home-hero__badges" aria-label={t("todayBoard")}>
      <span className="admin-today-board__badge bg-emerald-100 text-emerald-900">
        <span aria-hidden>↓</span>
        {arrivals} {t("arrivals")}
      </span>
      <span className="admin-today-board__badge bg-amber-100 text-amber-900">
        <span aria-hidden>↑</span>
        {departures} {t("departuresLabel")}
      </span>
      <span className="admin-today-board__badge bg-violet-100 text-violet-900">
        <span aria-hidden>✦</span>
        {toClean} {t("toClean")}
      </span>
    </div>
  );
}
