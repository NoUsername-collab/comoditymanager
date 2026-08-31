import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminSelect } from "@/components/admin/ui/AdminInput";
import type { AccountingExportSlice } from "@/domain/accounting/saga-export";

type MonthOption = {
  value: string;
  label: string;
};

type SliceOption = {
  value: AccountingExportSlice;
  label: string;
  hint?: string;
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
  slice: string;
  download: string;
};

export function StatisticsExportPanel({
  exportPath,
  focusYear,
  years,
  months,
  slices,
  labels,
}: {
  exportPath: string;
  focusYear: number;
  years: number[];
  months: MonthOption[];
  slices: SliceOption[];
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
          <AdminSelect
            name="year"
            defaultValue={String(focusYear)}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </AdminSelect>
        </label>

        <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-medium text-zinc-600">
          {labels.month}
          <AdminSelect
            name="month"
            defaultValue="all"
          >
            <option value="all">{labels.monthAll}</option>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </AdminSelect>
        </label>

        <label className="flex min-w-[12rem] flex-col gap-1 text-xs font-medium text-zinc-600">
          {labels.slice}
          <AdminSelect name="slice" defaultValue="fiscal">
            {slices.map((slice) => (
              <option key={slice.value} value={slice.value}>
                {slice.label}
              </option>
            ))}
          </AdminSelect>
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

        <AdminButton type="submit" variant="primary">
          {labels.download}
        </AdminButton>
      </form>
    </div>
  );
}
