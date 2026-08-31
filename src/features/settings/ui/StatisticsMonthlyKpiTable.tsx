export type MonthlyKpiRow = {
  label: string;
  occupancyPct: number;
  revenueRon: number;
  revenueComplete: boolean;
  adrRon: number | null;
  revparRon: number | null;
};

type Labels = {
  month: string;
  occupancy: string;
  revenue: string;
  adr: string;
  revpar: string;
  emDash: string;
};

export function StatisticsMonthlyKpiTable({
  title,
  rows,
  labels,
  formatRevenue,
  formatKpi,
}: {
  title: string;
  rows: MonthlyKpiRow[];
  labels: Labels;
  formatRevenue: (n: number) => string;
  formatKpi: (value: number | null, revenueComplete: boolean) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2">{labels.month}</th>
              <th className="px-4 py-2">{labels.occupancy}</th>
              <th className="px-4 py-2">{labels.revenue}</th>
              <th className="px-4 py-2">{labels.adr}</th>
              <th className="px-4 py-2">{labels.revpar}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-zinc-100">
                <td className="px-4 py-2.5 font-medium text-zinc-900">{row.label}</td>
                <td className="px-4 py-2.5 tabular-nums">{row.occupancyPct}%</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {row.revenueComplete
                    ? formatRevenue(row.revenueRon)
                    : labels.emDash}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatKpi(row.adrRon, row.revenueComplete)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatKpi(row.revparRon, row.revenueComplete)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
