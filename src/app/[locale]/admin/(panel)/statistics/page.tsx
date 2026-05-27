import { Link } from "@/i18n/navigation";
import { MonthCompareCards } from "@/components/admin/dashboard/MonthCompareCards";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { loadMonthComparison } from "@/services/month-comparison";
import { loadStatisticsReport } from "@/services/statistics";
import { StatisticsBarChart } from "@/components/admin/statistics/StatisticsBarChart";
import { StatisticsYearNav } from "@/components/admin/statistics/StatisticsYearNav";
import { getLocale, getTranslations } from "next-intl/server";

function formatRon(n: number, locale: string): string {
  const tag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function AdminStatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const locale = await getLocale();
  const tPages = await getTranslations("admin.pages.statistics");
  const tCommon = await getTranslations("admin.common");
  const params = await searchParams;
  let report: Awaited<ReturnType<typeof loadStatisticsReport>> | null = null;
  let monthCompare: Awaited<ReturnType<typeof loadMonthComparison>> | null = null;
  let error: string | null = null;

  try {
    report = await loadStatisticsReport();
  } catch (e) {
    error = e instanceof Error ? e.message : tCommon("loadDataError");
  }
  try {
    monthCompare = await loadMonthComparison();
  } catch {
    monthCompare = null;
  }

  const focusYear = report
    ? Number(params.year) || report.lastYear
    : new Date().getFullYear();
  const yearData = report?.years.find((y) => y.year === focusYear);
  const dateTag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";

  return (
    <AdminRetroPageFrame
      title={tPages("title")}
      description={tPages("continuous")}
    >
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {monthCompare && (
        <RetroXpWindow title={tPages("monthCompare")} className="mb-4">
          <MonthCompareCards compare={monthCompare} />
        </RetroXpWindow>
      )}

      {report && (
        <RetroXpWindow
          title={tPages("reportsRange", {
            first: report.firstYear,
            last: report.lastYear,
          })}
        >
          <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">{tPages("continuous")}</p>
            <p className="mt-1 text-emerald-900/90">{report.note}</p>
            <p className="mt-2 text-xs text-emerald-800/80">
              {tPages("dateRangeMeta", {
                first: report.firstYear,
                last: report.lastYear,
                rooms: report.totalActiveRooms,
                at: new Date(report.generatedAt).toLocaleString(dateTag),
              })}
            </p>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <StatisticsBarChart
              title={tPages("occupancyCompareTitle")}
              caption={tPages("occupancyCompareCaption")}
              items={report.years.map((y) => ({
                label: String(y.year),
                value: y.occupancyPct,
                tone: y.year === focusYear ? "emerald" : "zinc",
              }))}
              valueSuffix="%"
              maxValue={100}
            />
            <StatisticsBarChart
              title={tPages("confirmedCompareTitle")}
              caption={tPages("confirmedCompareCaption")}
              items={report.years.map((y) => ({
                label: String(y.year),
                value: y.confirmedStays,
                tone: y.year === focusYear ? "blue" : "zinc",
              }))}
            />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-zinc-700">
              {tPages("annualReport")}
            </p>
            <div className="mt-3">
              <StatisticsYearNav
                years={report.yearsWithData}
                focusYear={focusYear}
              />
            </div>
          </div>

          {yearData ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={tPages("confirmedStays")}
                  value={String(yearData.confirmedStays)}
                />
                <StatCard
                  label={tPages("guestNights")}
                  value={String(yearData.guestNights)}
                />
                <StatCard
                  label={tPages("roomOccupancy")}
                  value={`${yearData.occupancyPct}%`}
                />
                <StatCard
                  label={tCommon("revenue")}
                  value={
                    yearData.revenueComplete
                      ? formatRon(yearData.revenueRon, locale)
                      : tCommon("emDash")
                  }
                  hint={
                    !yearData.revenueComplete
                      ? tCommon("fillPriceOnConfirm")
                      : undefined
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <StatCard
                  label={tPages("requestsYear")}
                  value={String(yearData.cereriCreated)}
                  small
                />
                <StatCard
                  label={tPages("cancelledYear")}
                  value={String(yearData.cancelledStays)}
                  small
                />
                <StatCard
                  label={tPages("guestsTotal")}
                  value={`${yearData.adults} + ${yearData.children}`}
                  small
                />
              </div>

              <StatisticsBarChart
                title={tPages("monthlyOccupancy", { year: yearData.year })}
                caption={tPages("byCalendarMonths")}
                items={yearData.months.map((m) => ({
                  label: m.label,
                  value: m.occupancyPct,
                  tone: "emerald",
                }))}
                valueSuffix="%"
                maxValue={100}
              />

              <StatisticsBarChart
                title={tPages("confirmedMonthly", { year: yearData.year })}
                items={yearData.months.map((m) => ({
                  label: m.label,
                  value: m.confirmedStays,
                  tone: "blue",
                }))}
              />

              {yearData.buildings.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <div className="border-b border-zinc-100 px-5 py-3">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {tPages("perBuildingYear", { year: yearData.year })}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-4 py-2">{tPages("building")}</th>
                          <th className="px-4 py-2">{tCommon("roomsCol")}</th>
                          <th className="px-4 py-2">{tCommon("staysCol")}</th>
                          <th className="px-4 py-2">{tCommon("occupancy")}</th>
                          <th className="px-4 py-2">{tPages("nights")}</th>
                          <th className="px-4 py-2">{tCommon("revenue")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearData.buildings.map((b) => (
                          <tr
                            key={b.buildingId}
                            className="border-t border-zinc-100"
                          >
                            <td className="px-4 py-2.5 font-medium text-zinc-900">
                              {b.buildingName}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {b.activeRooms}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {b.confirmedStays}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {b.occupancyPct}%
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {b.guestNights}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {formatRon(b.revenueRon, locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-3">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {tPages("allYearsSummary")}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-4 py-2">{tCommon("yearCol")}</th>
                        <th className="px-4 py-2">{tCommon("confirmedCol")}</th>
                        <th className="px-4 py-2">{tCommon("occupancy")}</th>
                        <th className="px-4 py-2">{tPages("nights")}</th>
                        <th className="px-4 py-2">{tCommon("revenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.years.map((y) => (
                        <tr
                          key={y.year}
                          className={[
                            "border-t border-zinc-100",
                            y.year === focusYear && "bg-emerald-50/40",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/admin/statistics?year=${y.year}`}
                              className="font-semibold text-zinc-900 hover:underline"
                            >
                              {y.year}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {y.confirmedStays}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {y.occupancyPct}%
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {y.guestNights}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums">
                            {y.revenueComplete
                              ? formatRon(y.revenueRon, locale)
                              : tCommon("emDash")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">
              {tPages("noDataForYear", { year: focusYear })}
            </p>
          )}
        </RetroXpWindow>
      )}

      {!report && !error && (
        <p className="mt-8 text-center text-zinc-500">
          {tPages("noBookingsYet")}
        </p>
      )}
    </AdminRetroPageFrame>
  );
}

function StatCard({
  label,
  value,
  hint,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-900/5",
        small ? "px-4 py-3" : "px-5 py-4",
      ].join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-bold tabular-nums text-zinc-900",
          small ? "text-lg" : "text-2xl",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-amber-700">{hint}</p>}
    </div>
  );
}
