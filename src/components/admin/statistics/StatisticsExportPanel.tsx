type MonthOption = {
  value: string;
  label: string;
};

type Labels = {
  title: string;
  description: string;
  year: string;
  month: string;
  monthAll: string;
  format: string;
  formatSaga: string;
  formatContaplus: string;
  includeUninvoiced: string;
  includeUninvoicedHint: string;
  download: string;
};

export function StatisticsExportPanel({
  exportPath,
  focusYear,
  years,
  months,
  labels,
}: {
  exportPath: string;
  focusYear: number;
  years: number[];
  months: MonthOption[];
  labels: Labels;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{labels.title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{labels.description}</p>
      </div>

      <form
        action={exportPath}
        method="GET"
        className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="flex min-w-[8rem] flex-col gap-1 text-xs font-medium text-zinc-600">
          {labels.year}
          <select
            name="year"
            defaultValue={String(focusYear)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-zinc-600">
          {labels.month}
          <select
            name="month"
            defaultValue="all"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="all">{labels.monthAll}</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="flex min-w-[12rem] flex-col gap-2">
          <legend className="text-xs font-medium text-zinc-600">{labels.format}</legend>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="radio" name="format" value="saga" defaultChecked />
            {labels.formatSaga}
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input type="radio" name="format" value="contaplus" />
            {labels.formatContaplus}
          </label>
        </fieldset>

        <label className="flex max-w-sm items-start gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            name="includeUninvoiced"
            value="1"
            className="mt-1"
          />
          <span>
            {labels.includeUninvoiced}
            <span className="mt-0.5 block text-xs text-zinc-500">
              {labels.includeUninvoicedHint}
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          {labels.download}
        </button>
      </form>
    </div>
  );
}
