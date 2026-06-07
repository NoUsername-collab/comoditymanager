import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { AdminDashboardData } from "@/services/admin-dashboard";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { RoomGridTile } from "@/components/admin/ui/RoomGridTile";
import { RoomAvailabilityGrid } from "@/components/admin/ui/RoomAvailabilityGrid";
import { TodayBoardSection } from "@/components/admin/dashboard/TodayBoardSection";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { MonthCompareCards } from "@/components/admin/dashboard/MonthCompareCards";

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

  const quickActions = [
    {
      href: "/admin/bookings",
      title: tDashboard("quickCereri"),
      desc: tDashboard("quickCereriDesc"),
      icon: "📬",
      accent: "linear-gradient(135deg, #f87171, #dc2626)",
    },
    {
      href: "/receptie",
      title: tDashboard("quickReceptie"),
      desc: tDashboard("quickReceptieDesc"),
      icon: "☎️",
      accent: "linear-gradient(135deg, #fbbf24, #ea580c)",
    },
    {
      href: "/admin/calendar",
      title: tDashboard("quickCalendar"),
      desc: tDashboard("quickCalendarDesc"),
      icon: "📅",
      accent: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    },
    {
      href: "/admin#disponibilitate",
      title: tDashboard("quickAvail"),
      desc: tDashboard("quickAvailDesc"),
      icon: "▦",
      accent: "linear-gradient(135deg, #34d399, #059669)",
    },
    {
      href: "/admin/settings",
      title: tDashboard("quickSettings"),
      desc: tDashboard("quickSettingsDesc"),
      icon: "⚙️",
      accent: "linear-gradient(135deg, #71717a, #27272a)",
    },
  ] as const;

  return (
    <div className="admin-home">
      {/* ── Hero: compact 2-row layout ──────────────────────────── */}
      <header className="admin-home-hero admin-home-hero--liquid">
        {/* Row 1: identity + CTAs */}
        <div className="admin-home-hero__row1">
          <div className="admin-home-hero__identity">
            <h1 className="admin-home-hero__title">{data.pensionName}</h1>
            <p className="admin-home-hero__meta">
              <span className="capitalize">{data.todayLabel}</span>
              {" · "}
              {tCommon("checkIn")} {data.checkInTime} · {tCommon("checkout")} {data.checkOutTime}
            </p>
          </div>
          <div className="admin-home-hero__actions">
            {hasCereri ? (
              <Link href="/admin/bookings" className="admin-home-cta admin-home-cta--cereri">
                <span aria-hidden>📬</span>
                {tDashboard("pendingPuls", { count: cereriCount })}
              </Link>
            ) : null}
            <Link href={calHref} className="admin-home-cta admin-home-cta--secondary">
              {tCommon("currentMonthCalendar")}
            </Link>
          </div>
        </div>

        {/* Briefing + milestones — inline between rows */}
        {(data.briefingLine || data.milestones.length > 0) && (
          <div className="admin-home-hero__brief">
            {data.briefingLine && (
              <p className="admin-home-briefing">{data.briefingLine}</p>
            )}
            {data.milestones.length > 0 && (
              <div className="admin-home-milestones" aria-label={tCommon("achievements")}>
                {data.milestones.map((m) => (
                  <span key={m.id} className="admin-home-milestone">
                    <span aria-hidden>{m.emoji}</span> {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Row 2: KPIs — compact horizontal strip */}
        <div className="admin-home-kpis" role="list" aria-label={tCommon("quickKpis")}>
          <div
            className={["admin-home-kpi", hasCereri && "admin-home-kpi--alert"].filter(Boolean).join(" ")}
            role="listitem"
          >
            <span className="admin-home-kpi__value">{cereriCount}</span>
            <span className="admin-home-kpi__label">{tCommon("newRequestsLabel")}</span>
          </div>
          <div className="admin-home-kpi" role="listitem">
            <span className="admin-home-kpi__value">{stats.freeTonight}</span>
            <span className="admin-home-kpi__label">
              {tCommon("freeTonight")} / {stats.activeRooms}
            </span>
          </div>
          <div className="admin-home-kpi" role="listitem">
            <span className="admin-home-kpi__value">{stats.occupiedTonight}</span>
            <span className="admin-home-kpi__label">
              {tCommon("occupiedTonight")} · {stats.occupancyTonightPct}%
            </span>
          </div>
          <div className="admin-home-kpi" role="listitem">
            <span className="admin-home-kpi__value">{stats.weekOccupancyPct}%</span>
            <span className="admin-home-kpi__label">
              {tCommon("weekOccupancy")} · {tCommon("activeRoomsCount", { count: stats.activeRooms })}
            </span>
          </div>
        </div>
      </header>

      {data.error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {data.error}
        </p>
      )}

      {data.todayBoard && (
        <div className="admin-home-section">
          <TodayBoardSection board={data.todayBoard} />
        </div>
      )}

      {data.monthCompare && (
        <div className="admin-home-section">
          <MonthCompareCards compare={data.monthCompare} />
        </div>
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
            <Link href={calHref} className="admin-home-panel__link">
              {tDashboard("quickCalendar")} →
            </Link>
          </div>
          <div className="mt-4">{availabilityPanel}</div>
        </section>
      )}

      <div
        className={[
          "admin-home-split",
          cereriPreview.length === 0 && "admin-home-split--cereri-only",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section className="admin-home-panel" aria-labelledby="admin-home-actions-title">
          <div className="admin-home-panel__head">
            <div>
              <h2 id="admin-home-actions-title" className="admin-home-panel__title">
                {tCommon("quickActions")}
              </h2>
              <p className="admin-home-panel__desc">
                {tCommon("seeAll")}
              </p>
            </div>
          </div>
          <div className="admin-home-actions">
            {quickActions.map((a) => {
              const isCereri = a.href === "/admin/bookings";
              const showBadge = isCereri && hasCereri;

              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className={[
                    "admin-home-action",
                    showBadge && "admin-home-action--cereri",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className="admin-home-action__icon"
                    style={{ background: a.accent }}
                    aria-hidden
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="admin-home-action__title">{a.title}</span>
                    <span className="admin-home-action__desc">{a.desc}</span>
                    {showBadge && (
                      <span className="admin-home-action__badge">{cereriCount}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {cereriPreview.length > 0 && (
          <section
            className="admin-home-panel admin-home-panel--cereri"
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
              <Link href="/admin/bookings" className="admin-home-panel__link">
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
      </div>

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
