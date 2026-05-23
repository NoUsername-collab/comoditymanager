import Link from "next/link";
import { MonthCompareCards } from "@/components/admin/dashboard/MonthCompareCards";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { loadMonthComparison } from "@/services/month-comparison";
import { loadStatisticsReport } from "@/services/statistics";
import { StatisticsBarChart } from "@/components/admin/statistics/StatisticsBarChart";
import { StatisticsYearNav } from "@/components/admin/statistics/StatisticsYearNav";

function formatRon(n: number): string {
  return new Intl.NumberFormat("ro-RO", {
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
  const params = await searchParams;
  let report: Awaited<ReturnType<typeof loadStatisticsReport>> | null = null;
  let monthCompare: Awaited<ReturnType<typeof loadMonthComparison>> | null = null;
  let error: string | null = null;

  try {
    report = await loadStatisticsReport();
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare la încărcarea statisticilor";
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

  return (
    <AdminRetroPageFrame
      title="Statistici — Casa Emil"
      description="Rapoarte anuale din toate rezervările — de la prima zi de operare."
    >
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {monthCompare && (
        <RetroXpWindow title="Comparativ lună" className="mb-4">
          <MonthCompareCards compare={monthCompare} />
        </RetroXpWindow>
      )}

      {report && (
        <RetroXpWindow title={`Rapoarte ${report.firstYear}–${report.lastYear}`}>
          <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">Înregistrare continuă</p>
            <p className="mt-1 text-emerald-900/90">{report.note}</p>
            <p className="mt-2 text-xs text-emerald-800/80">
              Interval date: {report.firstYear}–{report.lastYear} ·{" "}
              {report.totalActiveRooms} camere active (referință) · actualizat{" "}
              {new Date(report.generatedAt).toLocaleString("ro-RO")}
            </p>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <StatisticsBarChart
              title="Ocupare camere — comparativ pe ani"
              caption="Procent din capacitatea anuală (camere active × zile)"
              items={report.years.map((y) => ({
                label: String(y.year),
                value: y.occupancyPct,
                tone: y.year === focusYear ? "emerald" : "zinc",
              }))}
              valueSuffix="%"
              maxValue={100}
            />
            <StatisticsBarChart
              title="Sejururi confirmate — comparativ pe ani"
              caption="Rezervări confirmate cu sejur în acel an"
              items={report.years.map((y) => ({
                label: String(y.year),
                value: y.confirmedStays,
                tone: y.year === focusYear ? "blue" : "zinc",
              }))}
            />
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-zinc-700">Raport anual</p>
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
                  label="Sejururi confirmate"
                  value={String(yearData.confirmedStays)}
                />
                <StatCard
                  label="Nopți oaspeți"
                  value={String(yearData.guestNights)}
                />
                <StatCard
                  label="Ocupare camere"
                  value={`${yearData.occupancyPct}%`}
                />
                <StatCard
                  label="Venituri"
                  value={
                    yearData.revenueComplete
                      ? formatRon(yearData.revenueRon)
                      : "—"
                  }
                  hint={
                    !yearData.revenueComplete
                      ? "Completează prețul la confirmare"
                      : undefined
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <StatCard
                  label="Cereri create în an"
                  value={String(yearData.cereriCreated)}
                  small
                />
                <StatCard
                  label="Anulate (în an)"
                  value={String(yearData.cancelledStays)}
                  small
                />
                <StatCard
                  label="Oaspeți (adulți + copii)"
                  value={`${yearData.adults} + ${yearData.children}`}
                  small
                />
              </div>

              <StatisticsBarChart
                title={`Ocupare lunară — ${yearData.year}`}
                caption="Pe luni calendaristice"
                items={yearData.months.map((m) => ({
                  label: m.label,
                  value: m.occupancyPct,
                  tone: "emerald",
                }))}
                valueSuffix="%"
                maxValue={100}
              />

              <StatisticsBarChart
                title={`Sejururi confirmate pe lună — ${yearData.year}`}
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
                      Pe clădire — {yearData.year}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-4 py-2">Clădire</th>
                          <th className="px-4 py-2">Camere</th>
                          <th className="px-4 py-2">Sejururi</th>
                          <th className="px-4 py-2">Ocupare</th>
                          <th className="px-4 py-2">Nopți</th>
                          <th className="px-4 py-2">Venituri</th>
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
                              {formatRon(b.revenueRon)}
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
                    Toți anii — sumar
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-4 py-2">An</th>
                        <th className="px-4 py-2">Confirmate</th>
                        <th className="px-4 py-2">Ocupare</th>
                        <th className="px-4 py-2">Nopți</th>
                        <th className="px-4 py-2">Venituri</th>
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
                              ? formatRon(y.revenueRon)
                              : "—"}
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
              Nu există date pentru anul {focusYear}.
            </p>
          )}
        </RetroXpWindow>
      )}

      {!report && !error && (
        <p className="mt-8 text-center text-zinc-500">
          Nu există încă rezervări — statisticile apar după prima cerere.
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
