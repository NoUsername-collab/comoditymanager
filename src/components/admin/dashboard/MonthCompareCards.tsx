import { AdminTextActionLink } from "@/components/admin/ui/AdminTextAction";
import { getTranslations } from "next-intl/server";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { AdminMetricHint } from "@/components/admin/ui/AdminMetricHint";
import type { MonthComparison } from "@/domain/statistics/month-compare";
import { formatRon } from "@/domain/invoice/informal-invoice";

function deltaLabel(delta: number | null, suffix = "%"): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix}`;
}

export async function MonthCompareCards({
  compare,
}: {
  compare: MonthComparison;
}) {
  const t = await getTranslations("admin.home");
  const tCommon = await getTranslations("admin.common");
  const { current, previousYear } = compare;
  const py = previousYear;
  const capHint = t("capacityHint", {
    rooms: current.activeRooms,
    days: current.daysInMonth,
    total: current.activeRooms * current.daysInMonth,
  });

  return (
    <AdminPanel
      title={t("monthStatsTitle", {
        month: current.monthLabel,
        year: current.year,
      })}
      bodyClassName="admin-home-window-body"
    >
      <section className="admin-panel-section !border-0 !bg-transparent !p-0 !shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="admin-panel-section__title">
              {current.monthLabel} {current.year}
            </h2>
            <p className="admin-panel-section__desc">
              {t("compareSameMonth")}
              {py ? ` (${py.monthLabel} ${py.year})` : ""}
            </p>
          </div>
          <AdminTextActionLink href="/admin/statistics" variant="primary" className="text-sm">
            {t("fullStatistics")}
          </AdminTextActionLink>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t("currentMonthOccupancy")}
            hint={t("occupancyPctHint", {
              rooms: current.activeRooms,
              days: current.daysInMonth,
            })}
            value={`${current.occupancyPct}%`}
            sub={
              py
                ? `${tCommon("lastYearValue", { value: `${py.occupancyPct}%` })} · ${deltaLabel(compare.occupancyDeltaPct)}`
                : tCommon("noLastYearData")
            }
            aboutLabel={t("currentMonthOccupancy")}
          />
          <MetricCard
            label={t("confirmedStaysCard")}
            hint={t("revenueHint")}
            value={String(current.confirmedStays)}
            sub={
              py
                ? tCommon("lastYearValue", {
                    value: String(py.confirmedStays),
                  })
                : undefined
            }
            aboutLabel={t("confirmedStaysCard")}
          />
          <MetricCard
            label={t("currentMonthRevenue")}
            hint={t("revenueHint")}
            value={current.revenueComplete ? formatRon(current.revenueRon) : "—"}
            sub={
              py?.revenueComplete && current.revenueComplete
                ? `${tCommon("lastYearValue", { value: formatRon(py.revenueRon) })} · ${deltaLabel(compare.revenueDeltaPct)}`
                : !current.revenueComplete
                  ? tCommon("fillPriceOnConfirm")
                  : py
                    ? tCommon("lastYearValue", {
                        value: py.revenueComplete
                          ? formatRon(py.revenueRon)
                          : "—",
                      })
                    : undefined
            }
            aboutLabel={t("currentMonthRevenue")}
          />
          <MetricCard
            label={t("roomNightsOccupied")}
            hint={t("roomNightHint")}
            value={String(current.occupiedRoomNights)}
            sub={
              py
                ? `${tCommon("lastYearValue", { value: `${py.occupiedRoomNights} / ${py.capacityRoomNights}` })}`
                : `${current.activeRooms} × ${current.daysInMonth} = ${current.capacityRoomNights}`
            }
            subHint={capHint}
            capacityHintLabel={t("capacityHint", {
              rooms: current.activeRooms,
              days: current.daysInMonth,
              total: current.capacityRoomNights,
            })}
            aboutLabel={t("roomNightsOccupied")}
          />
        </div>
      </section>
    </AdminPanel>
  );
}

function MetricCard({
  label,
  value,
  sub,
  hint,
  subHint,
  aboutLabel,
  capacityHintLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  subHint?: string;
  aboutLabel: string;
  capacityHintLabel?: string;
}) {
  return (
    <div className="admin-metric-card">
      <p className="admin-metric-card__label">
        <span>{label}</span>
        {hint ? (
          <AdminMetricHint
            text={hint}
            label={`${aboutLabel}?`}
          />
        ) : null}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">{value}</p>
      {sub ? (
        <p className="mt-1 text-xs text-zinc-500">
          {sub}
          {subHint && capacityHintLabel ? (
            <>
              {" "}
              <AdminMetricHint text={capacityHintLabel} label={capacityHintLabel} />
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
