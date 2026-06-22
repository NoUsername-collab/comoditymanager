import { Link } from "@/i18n/navigation";

export type StatisticsYearSummaryRow = {
  year: number;
  confirmedStays: number;
  occupancyPct: number;
  guestNights: number;
  revenueRon: number;
  revenueComplete: boolean;
  adrRon: number | null;
  revparRon: number | null;
};

type Labels = {
  yearCol: string;
  confirmedCol: string;
  occupancy: string;
  nights: string;
  revenue: string;
  adr: string;
  revpar: string;
  emDash: string;
};

export function StatisticsAllYearsSection({
  title,
  years,
  focusYear,
  labels,
  formatRevenue,
  formatKpi,
}: {
  title: string;
  years: StatisticsYearSummaryRow[];
  focusYear: number;
  labels: Labels;
  formatRevenue: (n: number) => string;
  formatKpi: (value: number | null, revenueComplete: boolean) => string;
}) {
  return (
    <div className="statistics-years-section admin-surface-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>

      <ul className="statistics-cards space-y-2 p-3">
        {years.map((yearRow) => (
          <li
            key={yearRow.year}
            className={[
              "statistics-card rounded-xl border p-3",
              yearRow.year === focusYear
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-zinc-200 bg-zinc-50/80",
            ].join(" ")}
          >
            <Link
              href={`/admin/statistics?year=${yearRow.year}`}
              className="statistics-year-card__link inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center text-base font-bold text-zinc-900 hover:underline"
            >
              {yearRow.year}
            </Link>
            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {labels.confirmedCol}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">
                  {yearRow.confirmedStays}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {labels.occupancy}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">
                  {yearRow.occupancyPct}%
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {labels.nights}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">
                  {yearRow.guestNights}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {labels.revenue}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">
                  {yearRow.revenueComplete
                    ? formatRevenue(yearRow.revenueRon)
                    : labels.emDash}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {labels.adr}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">
                  {formatKpi(yearRow.adrRon, yearRow.revenueComplete)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {labels.revpar}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-zinc-800">
                  {formatKpi(yearRow.revparRon, yearRow.revenueComplete)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="statistics-table-desktop overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2">{labels.yearCol}</th>
              <th className="px-4 py-2">{labels.confirmedCol}</th>
              <th className="px-4 py-2">{labels.occupancy}</th>
              <th className="px-4 py-2">{labels.nights}</th>
              <th className="px-4 py-2">{labels.revenue}</th>
              <th className="px-4 py-2">{labels.adr}</th>
              <th className="px-4 py-2">{labels.revpar}</th>
            </tr>
          </thead>
          <tbody>
            {years.map((yearRow) => (
              <tr
                key={yearRow.year}
                className={[
                  "border-t border-zinc-100",
                  yearRow.year === focusYear && "bg-emerald-50/40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/statistics?year=${yearRow.year}`}
                    className="font-semibold text-zinc-900 hover:underline"
                  >
                    {yearRow.year}
                  </Link>
                </td>
                <td className="px-4 py-2.5 tabular-nums">{yearRow.confirmedStays}</td>
                <td className="px-4 py-2.5 tabular-nums">{yearRow.occupancyPct}%</td>
                <td className="px-4 py-2.5 tabular-nums">{yearRow.guestNights}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {yearRow.revenueComplete
                    ? formatRevenue(yearRow.revenueRon)
                    : labels.emDash}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatKpi(yearRow.adrRon, yearRow.revenueComplete)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatKpi(yearRow.revparRon, yearRow.revenueComplete)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
