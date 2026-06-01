import { Link } from "@/i18n/navigation";
import { AdminTextActionLink } from "@/components/admin/ui/AdminTextAction";
import { getLocale, getTranslations } from "next-intl/server";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
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
    return <p className="text-sm text-zinc-500">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((b) => (
        <li key={b.id}>
          <Link
            href={`/admin/bookings/${b.id}`}
            className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-emerald-200 hover:shadow-md"
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
    <RetroXpWindow
      title={t("todayTitle", { dayLabel })}
      bodyClassName="admin-home-window-body"
    >
      <section className="admin-today-board">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {t("todayBoard")}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 capitalize">{dayLabel}</p>
            <p className="mt-2 text-xs text-sky-900/80">
              {board.cleaningWindowLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="admin-today-board__badge bg-emerald-100 text-emerald-900">
              <span aria-hidden>↓</span>
              {board.arrivals.length} {t("arrivals")}
            </span>
            <span className="admin-today-board__badge bg-amber-100 text-amber-900">
              <span aria-hidden>↑</span>
              {board.departures.length} {t("departuresLabel")}
            </span>
            <span className="admin-today-board__badge bg-violet-100 text-violet-900">
              <span aria-hidden>✦</span>
              {board.roomsToClean.length} {t("toClean")}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800">
              {tHome("checkInToday", { time: board.checkInTime })}
            </h3>
            <div className="mt-3">
              <GuestList
                items={board.arrivals}
                empty={t("noArrivals")}
                noRoomsLabel={t("emDash")}
              />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">
              {tHome("checkOutToday", { time: board.checkOutTime })}
            </h3>
            <div className="mt-3">
              <GuestList
                items={board.departures}
                empty={t("noDepartures")}
                noRoomsLabel={t("emDash")}
              />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-violet-800">
              {tHome("roomsToCleanTitle")}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {tHome("roomsToCleanHint")}
            </p>
            {board.roomsToClean.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">{t("noRoomsToClean")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {board.roomsToClean.map((r) => (
                  <li
                    key={r.room_id}
                    className="rounded-xl border border-violet-200/80 bg-white px-4 py-3 text-sm shadow-sm"
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
                      className="mt-1 text-xs"
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
    </RetroXpWindow>
  );
}
