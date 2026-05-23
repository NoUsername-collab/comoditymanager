"use client";

import type { InvoiceContext } from "@/services/invoice";
import { formatRon } from "@/domain/invoice/informal-invoice";
import { formatStayPeriod } from "@/lib/ro-calendar";

export function InformalInvoiceView({ ctx }: { ctx: InvoiceContext }) {
  const { invoice, pensionName, pensionAddress } = ctx;
  const issued = new Date().toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function printPage() {
    window.print();
  }

  return (
    <div className="informal-invoice-root mx-auto max-w-2xl">
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={printPage}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Printează / PDF
        </button>
      </div>

      <article className="informal-invoice-sheet overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg ring-1 ring-zinc-900/5 print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-zinc-100 bg-gradient-to-r from-zinc-900 to-zinc-800 px-8 py-8 text-white print:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-200/90">
            Document informativ
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">{pensionName}</h1>
          {pensionAddress && (
            <p className="mt-2 text-sm text-zinc-300">{pensionAddress}</p>
          )}
          <p className="mt-4 text-sm text-zinc-400">Emis: {issued}</p>
        </header>

        <div className="px-8 py-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Client
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {invoice.guest_name}
              </p>
              <p className="text-sm text-zinc-600">{invoice.guest_email}</p>
              {invoice.guest_phone && (
                <p className="text-sm text-zinc-600">{invoice.guest_phone}</p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Sejur
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                {formatStayPeriod(invoice.check_in, invoice.check_out, true)}
              </p>
              <p className="text-sm text-zinc-600">
                {invoice.nights} {invoice.nights === 1 ? "noapte" : "nopți"}
              </p>
            </div>
          </div>

          {invoice.lines.length > 0 ? (
            <table className="mt-8 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-2 pr-4">Cameră</th>
                  <th className="pb-2 pr-4 text-right">RON/noapte</th>
                  <th className="pb-2 pr-4 text-right">Nopți</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.room_id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-zinc-900">
                        {line.room_name}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {line.building_name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatRon(line.price_per_night)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {line.nights}
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums">
                      {formatRon(line.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-8 rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              Alocă camere rezervării pentru a calcula liniile de preț.
            </p>
          )}

          <div className="mt-8 flex flex-col items-end gap-1 border-t border-zinc-200 pt-6">
            {invoice.uses_recorded_total && invoice.total_price !== invoice.subtotal && (
              <p className="text-sm text-zinc-500">
                Estimare camere: {formatRon(invoice.subtotal)}
              </p>
            )}
            <p className="text-2xl font-bold tabular-nums text-zinc-900">
              Total:{" "}
              {invoice.total_price != null
                ? formatRon(invoice.total_price)
                : formatRon(invoice.subtotal)}
            </p>
          </div>

          <p className="mt-8 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
            {invoice.disclaimer}
          </p>
        </div>
      </article>
    </div>
  );
}
