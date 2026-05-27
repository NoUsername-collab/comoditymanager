import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { formatGuestGanttLabel } from "@/domain/guest-name";
import { formatStayPeriod } from "@/lib/ro-calendar";
import type { AdminDashboardData } from "@/services/admin-dashboard";
import { RoomAvailabilityGrid } from "@/components/admin/ui/RoomAvailabilityGrid";
import { RoomGridTile } from "@/components/admin/ui/RoomGridTile";

function formatCountLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function PublicStaffPreview({ data }: { data: AdminDashboardData }) {
  const t = useTranslations("public.staffPreview");
  const board = data.todayBoard;
  const attentionItems = [
    {
      id: "cereri",
      label: t("newRequests"),
      value: formatCountLabel(data.cereriCount, t("requestOne"), t("requestMany")),
      tone:
        data.cereriCount > 0
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-muted)]",
    },
    {
      id: "sosiri",
      label: t("arrivalsToday"),
      value: formatCountLabel(board?.arrivals.length ?? 0, t("arrivalOne"), t("arrivalMany")),
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    {
      id: "plecari",
      label: t("departuresToday"),
      value: formatCountLabel(board?.departures.length ?? 0, t("departureOne"), t("departureMany")),
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      id: "curatenie",
      label: t("roomsToClean"),
      value: formatCountLabel(board?.roomsToClean.length ?? 0, t("roomOne"), t("roomMany")),
      tone: "border-violet-200 bg-violet-50 text-violet-900",
    },
  ];

  return (
    <section className="public-section pt-0">
      <div className="site-card overflow-hidden border-[1.5px] shadow-[0_18px_48px_-28px_color-mix(in_srgb,var(--site-accent)_38%,transparent)]">
        <div className="border-b border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_82%,var(--accent-muted))] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--site-accent)]">
                {t("staffPreviewEyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--site-fg)] sm:text-3xl">
                {t("liveOperatorPanelOnPublicPage")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--site-muted)] sm:text-[15px]">
                {t("authenticatedPreviewHint")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="site-cta">
                {t("enterOperatorPanel")}
              </Link>
              <Link
                href="/admin/bookings"
                className="rounded-full border border-[var(--site-border)] px-5 py-3 text-sm font-semibold text-[var(--site-fg)] transition hover:bg-[color-mix(in_srgb,var(--site-card)_76%,var(--accent-muted))]"
              >
                {t("seeRequests")}
              </Link>
              <Link
                href="/admin#disponibilitate"
                className="rounded-full border border-[var(--site-border)] px-5 py-3 text-sm font-semibold text-[var(--site-fg)] transition hover:bg-[color-mix(in_srgb,var(--site-card)_76%,var(--accent-muted))]"
              >
                {t("openHeatmap")}
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {attentionItems.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border px-4 py-3 shadow-sm ${item.tone}`}
              >
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-80">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-black">{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        {data.error ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 sm:px-6">
            {data.error}
          </div>
        ) : null}

        <div className="grid gap-5 px-5 py-5 sm:px-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid gap-5">
            <section className="rounded-2xl border border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_88%,transparent)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--site-fg)]">{t("newRequests")}</h3>
                  <p className="mt-1 text-sm text-[var(--site-muted)]">
                    {t("firstRequestsToProcess")}
                  </p>
                </div>
                <Link
                  href="/admin/bookings"
                  className="text-sm font-semibold text-[var(--site-accent)] hover:underline"
                >
                  {t("all")} →
                </Link>
              </div>

              {data.cereriPreview.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[var(--site-border)] px-4 py-4 text-sm text-[var(--site-muted)]">
                  {t("noNewRequestNow")}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.cereriPreview.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="block rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] px-4 py-3 transition hover:border-[var(--site-accent)] hover:shadow-md"
                      >
                        <p className="font-bold text-[var(--site-fg)]">
                          {formatGuestGanttLabel(
                            booking.guest_last_name,
                            booking.guest_first_name,
                            booking.guest_name
                          )}
                        </p>
                        <p className="mt-1 text-sm text-[var(--site-muted)]">
                          {booking.room_names.join(", ") || t("roomsUnassignedYet")}
                        </p>
                        <p className="mt-1 text-xs text-[var(--site-muted)]">
                          {formatStayPeriod(booking.check_in, booking.check_out)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_88%,transparent)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--site-fg)]">{t("attentionToday")}</h3>
                  <p className="mt-1 text-sm text-[var(--site-muted)]">
                    {t("whatToCheckNow")}
                  </p>
                </div>
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-[var(--site-accent)] hover:underline"
                >
                    {t("admin")} →
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                    {t("freeTonight")}
                  </p>
                  <p className="mt-2 text-2xl font-black">{data.stats.freeTonight}</p>
                  <p className="mt-1 text-sm opacity-80">
                    {t("fromActiveRooms", { count: data.stats.activeRooms })}
                  </p>
                </article>
                <article className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                    {t("weekOccupancy")}
                  </p>
                  <p className="mt-2 text-2xl font-black">{data.stats.weekOccupancyPct}%</p>
                  <p className="mt-1 text-sm opacity-80">{t("currentOccupancyPace")}</p>
                </article>
              </div>

              {board ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--site-muted)]">
                      {t("cleaning")}
                    </p>
                    <p className="mt-2 text-sm text-[var(--site-fg)]">
                      {board.cleaningWindowLabel}
                    </p>
                  </div>

                  {board.roomsToClean.length > 0 ? (
                    <ul className="space-y-2">
                      {board.roomsToClean.slice(0, 4).map((room) => (
                        <li
                          key={room.room_id}
                          className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950"
                        >
                          <p className="font-bold">
                            {room.room_name}
                            <span className="font-medium opacity-70">
                              {" "}
                              · {room.building_name}
                            </span>
                          </p>
                          <p className="mt-1 opacity-80">{t("departureLabel", { name: room.guest_name })}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-[var(--site-border)] px-4 py-4 text-sm text-[var(--site-muted)]">
                      {t("noRoomToCleanToday")}
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_88%,transparent)] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--site-fg)]">{t("roomsHeatmap")}</h3>
                <p className="mt-1 text-sm text-[var(--site-muted)]">
                  {t("buildingsSnapshotHint")}
                </p>
              </div>
              <Link
                href="/admin#disponibilitate"
                className="text-sm font-semibold text-[var(--site-accent)] hover:underline"
              >
                {t("fullHeatmap")} →
              </Link>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {data.buildings.map((section) => (
                <article
                  key={section.building.id}
                  className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-[var(--site-fg)]">
                        {section.building.name}
                      </h4>
                      <p className="mt-1 text-xs text-[var(--site-muted)]">
                        {section.view_date_label} · {section.free_on_date} {t("free")} ·{" "}
                        {section.occupied_on_date} {t("occupied")} · {section.pending_on_date} {t("requests")}
                      </p>
                    </div>
                    <Link
                      href="/admin/calendar"
                      className="rounded-full border border-[var(--site-border)] px-3 py-1 text-xs font-semibold text-[var(--site-fg)] transition hover:bg-[color-mix(in_srgb,var(--site-card)_74%,var(--accent-muted))]"
                    >
                      {t("calendar")}
                    </Link>
                  </div>

                  <div className="mt-4">
                    <RoomAvailabilityGrid>
                      {section.rooms
                        .filter((room) => room.is_active)
                        .map((room) => (
                          <RoomGridTile
                            key={room.id}
                            id={room.id}
                            name={room.name}
                            floorName={room.floor_name}
                            isActive={room.is_active}
                            statusOnDate={room.status_on_date}
                            guestOnDate={room.guest_on_date}
                            dateLabel={section.view_date_label}
                          />
                        ))}
                    </RoomAvailabilityGrid>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
