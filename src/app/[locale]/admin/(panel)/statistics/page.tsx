import { MonthCompareCards } from "@/components/admin/dashboard/MonthCompareCards";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { AdminPanel } from "@/components/admin/shell/AdminPanel";
import { loadMonthComparison } from "@/services/month-comparison";
import { loadStatisticsReport } from "@/services/statistics";
import { StatisticsAllYearsSection } from "@/components/admin/statistics/StatisticsAllYearsSection";
import { StatisticsBarChartLazy } from "@/components/admin/statistics/StatisticsBarChartLazy";
import { StatisticsExportPanel } from "@/components/admin/statistics/StatisticsExportPanel";
import { StatisticsMonthlyKpiTable } from "@/components/admin/statistics/StatisticsMonthlyKpiTable";
import { StatisticsPerBuildingSection } from "@/components/admin/statistics/StatisticsPerBuildingSection";
import { StatisticsYearNav } from "@/components/admin/statistics/StatisticsYearNav";
import { getPathname } from "@/i18n/navigation";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import { requireStaff } from "@/lib/auth/require-staff";
import {
  getPensionSettings,
  pensionStatisticsVisibility,
} from "@/services/pension-settings";
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
  const [
    locale,
    tPages,
    tCommon,
    { memberRole },
    pension,
    params,
    reportResult,
    monthCompareResult,
  ] = await Promise.all([
    getLocale(),
    getTranslations("admin.pages.statistics"),
    getTranslations("admin.common"),
    requireStaff(),
    getPensionSettings().catch(() => null),
    searchParams,
    loadStatisticsReport()
      .then((value) => ({ status: "fulfilled" as const, value }))
      .catch((reason) => ({ status: "rejected" as const, reason })),
    loadMonthComparison()
      .then((value) => ({ status: "fulfilled" as const, value }))
      .catch((reason) => ({ status: "rejected" as const, reason })),
  ]);
  const visibility = pensionStatisticsVisibility(pension);
  if (!canAccessStatistics(memberRole, visibility)) {
    await redirect("/admin/settings?statistics=forbidden");
  }

  let report: Awaited<ReturnType<typeof loadStatisticsReport>> | null = null;
  let monthCompare: Awaited<ReturnType<typeof loadMonthComparison>> | null = null;
  let error: string | null = null;

  if (reportResult.status === "fulfilled") {
    report = reportResult.value;
  } else {
    const e = reportResult.reason;
    error = e instanceof Error ? e.message : tCommon("loadDataError");
  }
  if (monthCompareResult.status === "fulfilled") {
    monthCompare = monthCompareResult.value;
  }

  const focusYear = report
    ? Number(params.year) || report.lastYear
    : new Date().getFullYear();
  const yearData = report?.years.find((y) => y.year === focusYear);
  const dateTag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  const exportPath = getPathname({
    locale,
    href: "/admin/statistics/export",
  });
  const formatKpi = (value: number | null, revenueComplete: boolean) =>
    revenueComplete && value != null
      ? formatRon(value, locale)
      : tCommon("emDash");

  return (
    <AdminPageFrame
      title={tPages("title")}
      description={tPages("continuous")}
      className="statistics-page"
    >
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {monthCompare && (
        <AdminPanel title={tPages("monthCompare")} className="mb-4">
          <MonthCompareCards compare={monthCompare} />
        </AdminPanel>
      )}

      {report && (
        <AdminPanel
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

          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <StatisticsBarChartLazy
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
            <StatisticsBarChartLazy
              title={tPages("confirmedCompareTitle")}
              caption={tPages("confirmedCompareCaption")}
              items={report.years.map((y) => ({
                label: String(y.year),
                value: y.confirmedStays,
                tone: y.year === focusYear ? "blue" : "zinc",
              }))}
            />
          </div>

          <div className="mt-5">
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
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                <StatCard
                  label={tPages("adr")}
                  value={formatKpi(yearData.adrRon, yearData.revenueComplete)}
                  hint={tPages("adrHint")}
                />
                <StatCard
                  label={tPages("revpar")}
                  value={formatKpi(yearData.revparRon, yearData.revenueComplete)}
                  hint={tPages("revparHint")}
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

              <StatisticsBarChartLazy
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

              <StatisticsBarChartLazy
                title={tPages("confirmedMonthly", { year: yearData.year })}
                items={yearData.months.map((m) => ({
                  label: m.label,
                  value: m.confirmedStays,
                  tone: "blue",
                }))}
              />

              <StatisticsMonthlyKpiTable
                title={tPages("monthlyKpis", { year: yearData.year })}
                rows={yearData.months.map((m) => ({
                  label: m.label,
                  occupancyPct: m.occupancyPct,
                  revenueRon: m.revenueRon,
                  revenueComplete: yearData.revenueComplete,
                  adrRon: m.adrRon,
                  revparRon: m.revparRon,
                }))}
                labels={{
                  month: tPages("monthCol"),
                  occupancy: tCommon("occupancy"),
                  revenue: tCommon("revenue"),
                  adr: tPages("adr"),
                  revpar: tPages("revpar"),
                  emDash: tCommon("emDash"),
                }}
                formatRevenue={(n) => formatRon(n, locale)}
                formatKpi={(value, revenueComplete) =>
                  formatKpi(value, revenueComplete)
                }
              />

              <StatisticsExportPanel
                exportPath={exportPath}
                focusYear={focusYear}
                years={report.yearsWithData}
                months={yearData.months.map((m) => ({
                  value: String(m.month + 1),
                  label: m.label,
                }))}
                labels={{
                  title: tPages("exportTitle"),
                  description: tPages("exportDescription"),
                  year: tCommon("yearCol"),
                  month: tPages("exportMonth"),
                  monthAll: tPages("exportMonthAll"),
                  format: tPages("exportFormat"),
                  formatSaga: tPages("exportFormatSaga"),
                  formatContaplus: tPages("exportFormatContaplus"),
                  includeUninvoiced: tPages("exportIncludeUninvoiced"),
                  includeUninvoicedHint: tPages("exportIncludeUninvoicedHint"),
                  download: tPages("exportDownload"),
                }}
              />

              <StatisticsPerBuildingSection
                title={tPages("perBuildingYear", { year: yearData.year })}
                buildings={yearData.buildings}
                labels={{
                  building: tPages("building"),
                  roomsCol: tCommon("roomsCol"),
                  staysCol: tCommon("staysCol"),
                  occupancy: tCommon("occupancy"),
                  nights: tPages("nights"),
                  revenue: tCommon("revenue"),
                }}
                formatRevenue={(n) => formatRon(n, locale)}
              />

              <StatisticsAllYearsSection
                title={tPages("allYearsSummary")}
                years={report.years}
                focusYear={focusYear}
                labels={{
                  yearCol: tCommon("yearCol"),
                  confirmedCol: tCommon("confirmedCol"),
                  occupancy: tCommon("occupancy"),
                  nights: tPages("nights"),
                  revenue: tCommon("revenue"),
                  adr: tPages("adr"),
                  revpar: tPages("revpar"),
                  emDash: tCommon("emDash"),
                }}
                formatRevenue={(n) => formatRon(n, locale)}
                formatKpi={(value, revenueComplete) =>
                  formatKpi(value, revenueComplete)
                }
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              {tPages("noDataForYear", { year: focusYear })}
            </p>
          )}
        </AdminPanel>
      )}

      {!report && !error && (
        <p className="mt-5 text-center text-zinc-500">
          {tPages("noBookingsYet")}
        </p>
      )}
    </AdminPageFrame>
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
        "rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-900/5",
        small ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-bold tabular-nums text-zinc-900",
          small ? "text-base" : "text-xl",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-amber-700">{hint}</p>}
    </div>
  );
}
