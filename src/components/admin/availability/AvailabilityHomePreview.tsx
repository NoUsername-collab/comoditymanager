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

function buildFullPanelHref(year: number, month: number) {
  return `/admin/disponibilitate?${buildMonthQuery(year, month)}`;
}

export async function AvailabilityHomePreview({
  searchParams,
}: {
  searchParams: AvailabilityShellSearchParams;
}) {
  const tCommon = await getTranslations("admin.common");
  const tDashboard = await getTranslations("admin.dashboard");
  const effectiveToday = await getEffectiveToday();
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

  try {
    dashboard = await loadAvailabilityDashboard(year, month, null, "all");
  } catch (e) {
    error = e instanceof Error ? e.message : tCommon("error");
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
    <div className="availability-home-preview admin-home-availability-preview">
      <div className="availability-home-preview__nav">
        <div className="availability-home-preview__month-nav">
          <Link
            href={buildHomeHref(prevY, prevM)}
            className="availability-home-preview__nav-btn"
            aria-label={tCommon("previous")}
          >
            ←
          </Link>
          <span className="availability-home-preview__month-title capitalize">
            {dashboard.title}
          </span>
          <Link
            href={buildHomeHref(nextY, nextM)}
            className="availability-home-preview__nav-btn"
            aria-label={tCommon("next")}
          >
            →
          </Link>
        </div>
        <p className="availability-home-preview__rooms">
          <strong>{dashboard.total_rooms}</strong> {tCommon("rooms")}
        </p>
      </div>

      <AvailabilityMonthGridReadonly dashboard={dashboard} today={effectiveToday} />

      <AvailabilityWeekendsPanel
        weekends={weekends}
        nextSaturdayIso={dashboard.next_weekend?.saturday_iso ?? null}
        accentColor={null}
        readOnly
      />

      <p className="availability-home-preview__footer">
        <Link href={buildFullPanelHref(year, month)} className="availability-home-preview__full-link">
          {tDashboard("openFullAvailability")} →
        </Link>
      </p>
    </div>
  );
}
