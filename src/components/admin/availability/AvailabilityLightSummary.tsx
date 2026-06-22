import { AdminLinkButton } from "@/components/admin/ui/AdminLinkButton";
import { useTranslations } from "next-intl";
import type { AvailabilityDashboard as AvailabilityDashboardData } from "@/services/availability-month";

function buildHomeAvailabilityHref(input: {
  year: number;
  month: number;
  building?: string | null;
  feat?: string;
  view?: "month" | "week";
  ws?: string | null;
}) {
  const params = new URLSearchParams({
    y: String(input.year),
    m: String(input.month),
  });
  if (input.building) params.set("building", input.building);
  if (input.feat && input.feat !== "all") params.set("feat", input.feat);
  if (input.view === "week") params.set("view", "week");
  if (input.view === "week" && input.ws) params.set("ws", input.ws);
  return `/admin?${params.toString()}#disponibilitate`;
}

export function AvailabilityLightSummary({
  dashboard,
  buildingId,
  featureFilter,
  weekStart,
}: {
  dashboard: AvailabilityDashboardData;
  buildingId: string | null;
  featureFilter: "all" | "ac" | "fridge";
  weekStart: string | null;
}) {
  const tSummary = useTranslations("admin.availabilityLightSummary");
  const tCommon = useTranslations("admin.common");
  const nextWeekend = dashboard.weekend_picks[0] ?? dashboard.next_weekend;
  const homeHref = buildHomeAvailabilityHref({
    year: dashboard.year,
    month: dashboard.month,
    building: buildingId,
    feat: featureFilter,
    view: "week",
    ws: weekStart,
  });

  const cards = [
    {
      label: tSummary("minFree"),
      value: `${dashboard.kpis.min_free_rooms}`,
      sub: dashboard.kpis.min_free_day_iso
        ? tSummary("onDate", { date: dashboard.kpis.min_free_day_iso })
        : tSummary("inShownMonth"),
    },
    {
      label: tSummary("fullDays"),
      value: `${dashboard.kpis.days_full}`,
      sub: dashboard.kpis.vs_prev_full_delta === 0
        ? tSummary("noChangeVsLastMonth")
        : tSummary("deltaVsLastMonth", {
            delta: `${dashboard.kpis.vs_prev_full_delta > 0 ? "+" : ""}${dashboard.kpis.vs_prev_full_delta}`,
          }),
    },
    {
      label: tSummary("unassignedRequests"),
      value: `${dashboard.kpis.unassigned_nights}`,
      sub: tSummary("nightsNeedAttention"),
    },
    {
      label: tSummary("goodWeekend"),
      value: nextWeekend ? nextWeekend.label : tCommon("emDash"),
      sub: nextWeekend
        ? tSummary("minimumFreeRooms", { count: nextWeekend.min_free_rooms })
        : tSummary("noneInScanYet"),
    },
  ] as const;

  return (
    <div className="admin-surface-card overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            {tSummary("quickAvailability")}
          </p>
          <h2 className="mt-1 text-lg font-black text-zinc-900">
            {tSummary("summaryWithTitle", { title: dashboard.title })}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {tSummary("snapshotHint")}
          </p>
        </div>
        <AdminLinkButton href={homeHref} variant="secondary">
          {tSummary("openFullPanel")} →
        </AdminLinkButton>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              {card.label}
            </p>
            <p className="mt-1 text-lg font-black text-zinc-900">{card.value}</p>
            <p className="mt-1 text-xs text-zinc-600">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
