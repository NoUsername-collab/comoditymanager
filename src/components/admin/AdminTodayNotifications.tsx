import type { TodayBoard } from "@/services/today-board";
import { getTranslations } from "next-intl/server";

export async function AdminTodayNotifications({
  board,
  cereriCount,
}: {
  board: TodayBoard | null;
  cereriCount: number;
}) {
  const t = await getTranslations("admin.common");
  if (!board) return null;

  return (
    <div className="admin-hud-today-inline" aria-label={t("notificationsToday")}>
      <span className="admin-hud-today-inline__stat admin-hud-today-inline__stat--arrival">
        <strong>{board.arrivals.length}</strong> {t("arrivalsShort")}
      </span>
      <span className="admin-hud-today-inline__stat admin-hud-today-inline__stat--departure">
        <strong>{board.departures.length}</strong> {t("departuresShort")}
      </span>
      <span className="admin-hud-today-inline__stat admin-hud-today-inline__stat--clean">
        <strong>{board.roomsToClean.length}</strong> {t("toCleanShort")}
      </span>
      {cereriCount > 0 && (
        <span className="admin-hud-today-inline__stat admin-hud-today-inline__stat--alert">
          <strong>{cereriCount}</strong> {t("newShort")}
        </span>
      )}
    </div>
  );
}
