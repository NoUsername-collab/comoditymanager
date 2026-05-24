import Link from "next/link";
import type { AdminDashboardData } from "@/services/admin-dashboard";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { cereriNoiPulsText } from "@/lib/ro-copy";
import { getBuildingTheme } from "@/lib/building-theme";
import { occupancyCaptionFromWindow } from "@/lib/admin-ui";
import { ClimateLegend } from "@/components/admin/ui/ClimateLegend";
import { RoomGridTile } from "@/components/admin/ui/RoomGridTile";
import { RoomAvailabilityGrid } from "@/components/admin/ui/RoomAvailabilityGrid";
import { OccupancyRow } from "@/components/admin/ui/OccupancyRow";
import { AdminDayNightLiquid } from "@/components/admin/AdminDayNightLiquid";
import { TodayBoardSection } from "@/components/admin/dashboard/TodayBoardSection";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { MonthCompareCards } from "@/components/admin/dashboard/MonthCompareCards";

const QUICK_ACTIONS = [
  {
    href: "/admin/bookings",
    title: "Cereri noi",
    desc: "Confirmă și alocă camere",
    icon: "📬",
    accent: "linear-gradient(135deg, #f87171, #dc2626)",
    cereri: true,
  },
  {
    href: "/receptie",
    title: "Recepție rapidă",
    desc: "Telefon & check-in",
    icon: "☎️",
    accent: "linear-gradient(135deg, #fbbf24, #ea580c)",
  },
  {
    href: "/admin/calendar",
    title: "Calendar",
    desc: "Vedere lună / camere",
    icon: "📅",
    accent: "linear-gradient(135deg, #a78bfa, #7c3aed)",
  },
  {
    href: "/admin/disponibilitate",
    title: "Disponibilitate",
    desc: "Heat map & weekenduri",
    icon: "▦",
    accent: "linear-gradient(135deg, #34d399, #059669)",
  },
  {
    href: "/admin/buildings",
    title: "Clădiri",
    desc: "Structură & etaje",
    icon: "🏠",
    accent: "linear-gradient(135deg, #60a5fa, #2563eb)",
  },
  {
    href: "/admin/rooms",
    title: "Camere",
    desc: "Capacitate & preț",
    icon: "🛏",
    accent: "linear-gradient(135deg, #2dd4bf, #0d9488)",
  },
  {
    href: "/admin/settings",
    title: "Setări",
    desc: "Ore & paturi extra",
    icon: "⚙️",
    accent: "linear-gradient(135deg, #71717a, #27272a)",
  },
] as const;

function BuildingTonightCard({
  data,
}: {
  data: AdminDashboardData["buildings"][0];
}) {
  const theme = getBuildingTheme(data.building.ac_mode, data.building.name);
  const activeRooms = data.rooms.filter((r) => r.is_active);

  return (
    <article
      className={[
        "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg",
        theme.border,
      ].join(" ")}
    >
      <div
        className={["px-4 py-3", theme.headerBg].join(" ")}
        style={{ borderBottom: `3px solid ${theme.accent}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: theme.accent }}
            />
            <h3 className="font-semibold text-zinc-900">{data.building.name}</h3>
          </div>
          <Link
            href={`/admin/rooms/new?building=${data.building.id}`}
            className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            + cameră
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{theme.label}</p>
      </div>

      <div className="space-y-3 px-4 py-3">
        <OccupancyRow
          label={data.on_date.label}
          pct={data.on_date.occupancy_pct}
          accent={theme.accent}
          barTrack={theme.barBg}
          caption={occupancyCaptionFromWindow(data.on_date, true)}
        />

        {activeRooms.length > 0 ? (
          <RoomAvailabilityGrid>
            {activeRooms.map((room) => (
              <RoomGridTile
                key={room.id}
                id={room.id}
                name={room.name}
                floorName={room.floor_name}
                isActive={room.is_active}
                statusOnDate={room.status_on_date}
                guestOnDate={room.guest_on_date}
                dateLabel={data.view_date_label}
              />
            ))}
          </RoomAvailabilityGrid>
        ) : (
          <p className="text-xs text-zinc-400">Nicio cameră activă.</p>
        )}
      </div>

      <div className="mt-auto border-t border-zinc-100 px-4 py-2">
        <Link
          href="/admin/buildings"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          Detalii clădire →
        </Link>
      </div>
    </article>
  );
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const { stats, cereriCount, cereriPreview } = data;
  const now = new Date();
  const calHref = `/admin/calendar?y=${now.getFullYear()}&m=${now.getMonth()}`;
  const hasCereri = cereriCount > 0;

  return (
    <div className="admin-home">
      <header className="admin-home-hero admin-home-hero--liquid">
        <AdminDayNightLiquid hero className="admin-dn-liquid--hero admin-home-hero__liquid" />
        <div className="admin-home-hero__main">
          <p className="admin-home-hero__eyebrow">Acasă · panou recepție</p>
          <h1 className="admin-home-hero__title">{data.pensionName}</h1>
          <p className="admin-home-hero__meta">
            <span className="capitalize">{data.todayLabel}</span>
            {" · "}
            Check-in {data.checkInTime} · Check-out {data.checkOutTime}
          </p>
          <p className="admin-home-mood">{data.moodLine}</p>
          {data.briefingLine && (
            <p className="admin-home-briefing">{data.briefingLine}</p>
          )}
          {data.milestones.length > 0 && (
            <div className="admin-home-milestones" aria-label="Realizări">
              {data.milestones.map((m) => (
                <span key={m.id} className="admin-home-milestone">
                  <span aria-hidden>{m.emoji}</span> {m.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="admin-home-hero__actions">
          {hasCereri ? (
            <Link href="/admin/bookings" className="admin-home-cta admin-home-cta--cereri">
              <span aria-hidden>📬</span>
              {cereriNoiPulsText(cereriCount)}
            </Link>
          ) : null}
          <Link href={calHref} className="admin-home-cta admin-home-cta--secondary">
            Calendar luna curentă →
          </Link>
        </div>

        <div className="admin-home-kpis" role="list" aria-label="Indicatori rapizi">
          <div
            className={["admin-home-kpi", hasCereri && "admin-home-kpi--alert"].filter(Boolean).join(" ")}
            role="listitem"
          >
            <span className="admin-home-kpi__value">{cereriCount}</span>
            <span className="admin-home-kpi__label">Cereri noi</span>
          </div>
          <div className="admin-home-kpi" role="listitem">
            <span className="admin-home-kpi__value">{stats.freeTonight}</span>
            <span className="admin-home-kpi__label">
              Libere diseară / {stats.activeRooms}
            </span>
          </div>
          <div className="admin-home-kpi" role="listitem">
            <span className="admin-home-kpi__value">{stats.occupiedTonight}</span>
            <span className="admin-home-kpi__label">
              Ocupate · {stats.occupancyTonightPct}%
            </span>
          </div>
          <div className="admin-home-kpi" role="listitem">
            <span className="admin-home-kpi__value">{stats.weekOccupancyPct}%</span>
            <span className="admin-home-kpi__label">
              Săptămâna · {stats.buildingsCount} clădiri
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
                Acțiuni rapide
              </h2>
              <p className="admin-home-panel__desc">
                Destinații frecvente — un click
              </p>
            </div>
          </div>
          <div className="admin-home-actions">
            {QUICK_ACTIONS.map((a) => {
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
                  Cereri în așteptare
                </h2>
                <p className="admin-home-panel__desc">
                  Procesează rapid — confirmă și alocă camere
                </p>
              </div>
              <Link href="/admin/bookings" className="admin-home-panel__link">
                Toate →
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
        aria-labelledby="admin-home-buildings-title"
      >
        <div className="admin-home-buildings-head">
          <div>
            <h2 id="admin-home-buildings-title" className="admin-home-panel__title">
              Diseară — pe clădiri
            </h2>
            <p className="admin-home-panel__desc">
              Grid live: alb liber · roșu ocupat
            </p>
          </div>
          <Link href={calHref} className="admin-home-panel__link">
            Calendar →
          </Link>
        </div>

        <ClimateLegend />

        {data.buildings.length > 0 ? (
          <div className="admin-home-buildings-grid mt-4">
            {data.buildings.map((b) => (
              <BuildingTonightCard key={b.building.id} data={b} />
            ))}
          </div>
        ) : (
          <AdminEmptyState
            emoji="🏠"
            title="Încă nu ai clădiri configurate"
            description="Adaugă prima clădire și camerele — apoi Acasă devine panoul tău de recepție live."
            actionHref="/admin/buildings/new"
            actionLabel="+ Prima clădire"
          />
        )}
      </section>
    </div>
  );
}
