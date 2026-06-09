import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { AdminDashboardData } from "@/services/admin-dashboard";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { RoomGridTile } from "@/components/admin/ui/RoomGridTile";
import { RoomAvailabilityGrid } from "@/components/admin/ui/RoomAvailabilityGrid";
import { CheckInMilestoneBoard } from "@/components/admin/dashboard/CheckInMilestoneBoard";
import { TodayBoardBadges } from "@/components/admin/dashboard/TodayBoardBadges";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export async function AdminDashboard({
  data,
  availabilityPanel,
}: {
  data: AdminDashboardData;
  availabilityPanel?: ReactNode;
}) {
  const tDashboard = await getTranslations("admin.dashboard");
  const tCommon = await getTranslations("admin.common");
  const { stats, cereriCount, cereriPreview } = data;
  const now = new Date();
  const calHref = `/admin/calendar?y=${now.getFullYear()}&m=${now.getMonth()}`;
  const hasCereri = cereriCount > 0;
  const liveRooms = data.buildings
    .flatMap((section) =>
      section.rooms
        .filter((room) => room.is_active)
        .map((room) => ({
          ...room,
          viewDateLabel: section.view_date_label,
        }))
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ro-RO"));

  return (
    <div className="admin-home ml-content">
      {/* ── Hero: ultra-compact strip ─────────────────────────── */}
      <header className="admin-home-hero admin-home-hero--liquid">
        {/* Single row: name · date · KPIs · CTAs */}
        <div className="admin-home-hero__strip">
          {/* Left: identity */}
          <div className="admin-home-hero__identity">
            <div className="admin-home-hero__identity-row">
              <h1 className="admin-home-hero__title">{data.pensionName}</h1>
              <span className="admin-home-hero__meta">
                <span className="capitalize">{data.todayLabel}</span>
                {" · CI "}
                {data.checkInTime}
                {" · CO "}
                {data.checkOutTime}
              </span>
            </div>
            {data.todayBoard && (
              <TodayBoardBadges
                arrivals={data.todayBoard.arrivals.length}
                departures={data.todayBoard.departures.length}
                toClean={data.todayBoard.roomsToClean.length}
              />
            )}
          </div>

          {/* Center: KPI pills inline */}
          <div className="admin-home-kpis" role="list" aria-label={tCommon("quickKpis")}>
            <span
              className={["admin-home-kpi", hasCereri && "admin-home-kpi--alert"].filter(Boolean).join(" ")}
              role="listitem"
            >
              <strong>{cereriCount}</strong> {tCommon("newRequestsLabel")}
            </span>
            <span className="admin-home-kpi" role="listitem">
              <strong>{stats.freeTonight}</strong> {tCommon("freeTonight")}
            </span>
            <span className="admin-home-kpi" role="listitem">
              <strong>{stats.occupiedTonight}</strong> {tCommon("occupiedTonight")} · {stats.occupancyTonightPct}%
            </span>
            <span className="admin-home-kpi" role="listitem">
              <strong>{stats.weekOccupancyPct}%</strong> {tCommon("weekOccupancy")}
            </span>
          </div>

          {/* Right: CTAs */}
          <div className="admin-home-hero__actions">
            <Link href={calHref} className="admin-home-cta admin-home-cta--secondary">
              {tCommon("currentMonthCalendar")}
            </Link>
          </div>
        </div>

      </header>

      {data.error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {data.error}
        </p>
      )}

      {data.todayBoard && (
        <section className="admin-home-section admin-home-checkin-quest-wrap">
          <CheckInMilestoneBoard
            checkInTime={data.todayBoard.checkInTime}
            pending={data.todayBoard.pendingCheckIns}
            completedCount={data.todayBoard.completedCheckInsToday}
            checkinSettings={data.checkinSettings}
          />
        </section>
      )}

      {availabilityPanel && (
        <section
          id="disponibilitate"
          className="admin-home-panel admin-home-section"
          aria-labelledby="admin-home-availability-title"
        >
          <div className="admin-home-panel__head">
            <div>
              <h2 id="admin-home-availability-title" className="admin-home-panel__title">
                {tDashboard("quickAvail")}
              </h2>
              <p className="admin-home-panel__desc">
                {tDashboard("quickAvailDesc")}
              </p>
            </div>
            <Link href="/admin/disponibilitate" className="admin-home-panel__link">
              {tDashboard("openFullAvailability")} →
            </Link>
          </div>
          {availabilityPanel}
        </section>
      )}

      {cereriPreview.length > 0 && (
        <section
          className="admin-home-panel admin-home-panel--cereri admin-home-section"
          aria-labelledby="admin-home-cereri-title"
        >
          <div className="admin-home-panel__head">
            <div>
              <h2 id="admin-home-cereri-title" className="admin-home-panel__title">
                {tCommon("cereriQueue")}
              </h2>
              <p className="admin-home-panel__desc">
                {tDashboard("quickCereriDesc")}
              </p>
            </div>
            <Link href="/admin/cazari" className="admin-home-panel__link">
              {tCommon("seeAll")} →
            </Link>
          </div>
          <ul className="admin-home-cereri-list">
            {cereriPreview.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/bookings/${c.id}`} className="admin-home-cereri-item">
                  <span className="admin-home-cereri-item__guest">
                    {formatGuestGanttLabel(
                      c.guest_last_name,
                      c.guest_first_name,
                      c.guest_name
                    )}
                    <span className="admin-home-cereri-item__meta">
                      {" "}
                      · {c.num_adults}+{c.num_children} pers.
                    </span>
                  </span>
                  <span className="admin-home-cereri-item__dates">
                    {formatStayPeriod(c.check_in, c.check_out)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className="admin-home-panel admin-home-section"
        aria-labelledby="admin-home-rooms-title"
      >
        <div className="admin-home-buildings-head">
          <div>
            <h2 id="admin-home-rooms-title" className="admin-home-panel__title">
              {tCommon("roomGrid")}
            </h2>
            <p className="admin-home-panel__desc">
              Status operațional read-only.
            </p>
          </div>
          <Link href={calHref} className="admin-home-panel__link">
            {tDashboard("quickCalendar")} →
          </Link>
        </div>

        {liveRooms.length > 0 ? (
          <div className="mt-4 space-y-3">
            <RoomAvailabilityGrid>
              {liveRooms.map((room) => (
                <RoomGridTile
                  key={room.id}
                  id={room.id}
                  name={room.name}
                  floorName={room.floor_name}
                  isActive={room.is_active}
                  statusOnDate={room.status_on_date}
                  guestOnDate={room.guest_on_date}
                  dateLabel={room.viewDateLabel}
                  href={null}
                />
              ))}
            </RoomAvailabilityGrid>
            <p className="text-xs text-zinc-500">
              Verde = liberă, roșu = ocupată, galben = cerere.
            </p>
          </div>
        ) : (
          <AdminEmptyState
            emoji="🛏"
            title={tCommon("noRoomsConfigured")}
            description={tDashboard("configureRoomsFromSettings")}
            actionHref="/admin/settings/location"
            actionLabel={tDashboard("openConfiguration")}
          />
        )}
      </section>
    </div>
  );
}
