import { Link } from "@/i18n/navigation";
import { AdminTextActionLink } from "@/components/admin/ui/AdminTextAction";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import type { TodayBoard } from "@/services/today-board";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { formatStayPeriod } from "@/lib/ro-calendar";

function GuestList({
  items,
  empty,
  noRoomsLabel,
}: {
  items: TodayBoard["arrivals"];
  empty: string;
  noRoomsLabel: string;
}) {
  if (items.length === 0) {
    return <p className="admin-today-board__empty">{empty}</p>;
  }
  return (
    <ul className="admin-today-board__list">
      {items.map((b) => (
        <li key={b.id}>
          <Link
            href={`/admin/bookings/${b.id}`}
            className="admin-today-board__card admin-today-board__card--link"
          >
            <p className="font-semibold text-zinc-900">
              {formatGuestGanttLabel(
                b.guest_last_name,
                b.guest_first_name,
                b.guest_name
              )}
            </p>
            <p className="mt-0.5 text-zinc-600">
              {b.room_names.join(", ") || noRoomsLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatStayPeriod(b.check_in, b.check_out)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function TodayBoardSection({ board }: { board: TodayBoard }) {
  const locale = await getLocale();
  const t = await getTranslations("admin.common");
  const tHome = await getTranslations("admin.home");
  const dateTag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  const dayLabel = new Date(board.todayIso + "T12:00:00").toLocaleDateString(
    dateTag,
    { weekday: "long", day: "numeric", month: "long" }
  );

  return (
    <AdminPanel
      title={t("todayTitle", { dayLabel })}
      bodyClassName="admin-home-window-body admin-home-window-body--compact"
    >
      <section className="admin-today-board admin-today-board--compact">
        <p className="admin-today-board__cleaning-hint">{board.cleaningWindowLabel}</p>

        <div className="admin-today-board__grid">
          <div>
            <h3 className="admin-today-board__col-title admin-today-board__col-title--in">
              {tHome("checkInToday", { time: board.checkInTime })}
            </h3>
            <div className="admin-today-board__col-body">
              <GuestList
                items={board.arrivals}
                empty={t("noArrivals")}
                noRoomsLabel={t("emDash")}
              />
            </div>
          </div>
          <div>
            <h3 className="admin-today-board__col-title admin-today-board__col-title--out">
              {tHome("checkOutToday", { time: board.checkOutTime })}
            </h3>
            <div className="admin-today-board__col-body">
              <GuestList
                items={board.departures}
                empty={t("noDepartures")}
                noRoomsLabel={t("emDash")}
              />
            </div>
          </div>
          <div>
            <h3 className="admin-today-board__col-title admin-today-board__col-title--clean">
              {tHome("roomsToCleanTitle")}
            </h3>
            <p className="admin-today-board__col-hint">{tHome("roomsToCleanHint")}</p>
            {board.roomsToClean.length === 0 ? (
              <p className="admin-today-board__empty">{t("noRoomsToClean")}</p>
            ) : (
              <ul className="admin-today-board__list">
                {board.roomsToClean.map((r) => (
                  <li
                    key={r.room_id}
                    className="admin-today-board__card admin-today-board__card--clean"
                  >
                    <p className="font-semibold text-zinc-900">
                      {r.room_name}
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {r.building_name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-zinc-600">
                      {tHome("departureGuest", { name: r.guest_name })}
                    </p>
                    <AdminTextActionLink
                      href={`/admin/bookings/${r.booking_id}`}
                      variant="accent"
                      className="admin-today-board__card-link"
                    >
                      {t("openBooking")} →
                    </AdminTextActionLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </AdminPanel>
  );
}
