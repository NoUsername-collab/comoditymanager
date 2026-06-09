import { Link } from "@/i18n/navigation";
import { AvailabilityMonthGridReadonly } from "@/components/admin/availability/AvailabilityMonthGridReadonly";
import { AvailabilityWeekendsPanel } from "@/components/admin/availability/AvailabilityWeekendsPanel";
import { loadAvailabilityDashboard } from "@/services/availability-month";
import type { AvailabilityShellSearchParams } from "@/components/admin/availability/AvailabilityDashboardShell";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { getTranslations } from "next-intl/server";

function buildMonthQuery(year: number, month: number) {
  return new URLSearchParams({ y: String(year), m: String(month) }).toString();
}

function buildHomeHref(year: number, month: number) {
  return `/admin?${buildMonthQuery(year, month)}#disponibilitate`;
}

export async function AvailabilityHomePreview({
  searchParams,
}: {
  searchParams: AvailabilityShellSearchParams;
}) {
  const todayPromise = getEffectiveToday();
  const [tCommon, effectiveToday, dashboardResult] = await Promise.all([
    getTranslations("admin.common"),
    todayPromise,
    todayPromise
      .then((today) => {
        const refDate = new Date(today + "T00:00:00");
        const year = Number(searchParams.y) || refDate.getFullYear();
        const month =
          searchParams.m !== undefined
            ? Number(searchParams.m)
            : refDate.getMonth();
        return loadAvailabilityDashboard(year, month, null, "all");
      })
      .then((dashboard) => ({ ok: true as const, dashboard }))
      .catch((e) => ({ ok: false as const, error: e })),
  ]);

  const refDate = new Date(effectiveToday + "T00:00:00");
  const year = Number(searchParams.y) || refDate.getFullYear();
  const month =
    searchParams.m !== undefined ? Number(searchParams.m) : refDate.getMonth();

  const prevM = month === 0 ? 11 : month - 1;
  const prevY = month === 0 ? year - 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const nextY = month === 11 ? year + 1 : year;

  let dashboard: Awaited<ReturnType<typeof loadAvailabilityDashboard>> | null = null;
  let error: string | null = null;

  if (dashboardResult.ok) {
    dashboard = dashboardResult.dashboard;
  } else {
    error =
      dashboardResult.error instanceof Error
        ? dashboardResult.error.message
        : tCommon("error");
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (!dashboard) return null;

  const weekendSlots = dashboard.weekend_picks.slice(0, 4);
  const weekends =
    weekendSlots.length > 0
      ? weekendSlots
      : dashboard.next_weekend
        ? [dashboard.next_weekend]
        : [];

  return (
    <div className="availability-home-preview">
      <div className="availability-home-preview__toolbar">
        <div className="availability-home-preview__period">
          <div className="availability-home-preview__arrows">
            <Link
              href={buildHomeHref(prevY, prevM)}
              className="availability-home-preview__arrow"
              aria-label={tCommon("previous")}
            >
              ‹
            </Link>
            <Link
              href={buildHomeHref(nextY, nextM)}
              className="availability-home-preview__arrow"
              aria-label={tCommon("next")}
            >
              ›
            </Link>
          </div>
          <span className="availability-home-preview__month capitalize">
            {dashboard.title}
          </span>
        </div>
        <span className="availability-home-preview__rooms-pill">
          <strong>{dashboard.total_rooms}</strong> {tCommon("rooms")}
        </span>
      </div>

      <div className="availability-home-preview__body">
        <div className="availability-home-preview__calendar">
          <AvailabilityMonthGridReadonly dashboard={dashboard} today={effectiveToday} />
        </div>
        <div className="availability-home-preview__weekends">
          <AvailabilityWeekendsPanel
            weekends={weekends}
            nextSaturdayIso={dashboard.next_weekend?.saturday_iso ?? null}
            accentColor={null}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
