import Link from "next/link";
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
      label: "Minim liber",
      value: `${dashboard.kpis.min_free_rooms}`,
      sub: dashboard.kpis.min_free_day_iso
        ? `pe ${dashboard.kpis.min_free_day_iso}`
        : "în luna afișată",
    },
    {
      label: "Zile pline",
      value: `${dashboard.kpis.days_full}`,
      sub: dashboard.kpis.vs_prev_full_delta === 0
        ? "fără schimbare vs luna trecută"
        : `${dashboard.kpis.vs_prev_full_delta > 0 ? "+" : ""}${dashboard.kpis.vs_prev_full_delta} vs luna trecută`,
    },
    {
      label: "Cereri nealocate",
      value: `${dashboard.kpis.unassigned_nights}`,
      sub: "nopți care cer atenție",
    },
    {
      label: "Weekend bun",
      value: nextWeekend ? nextWeekend.label : "—",
      sub: nextWeekend
        ? `${nextWeekend.min_free_rooms} camere libere minim`
        : "nu există încă în scan",
    },
  ] as const;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Disponibilitate rapidă
          </p>
          <h2 className="mt-1 text-lg font-black text-zinc-900">
            Rezumat {dashboard.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Snapshot scurt pentru Gantt. Panoul complet este acum integrat în Acasă.
          </p>
        </div>
        <Link
          href={homeHref}
          className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-white"
        >
          Deschide panoul complet →
        </Link>
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
