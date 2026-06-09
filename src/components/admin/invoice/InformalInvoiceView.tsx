"use client";

import type { InvoiceContext } from "@/services/invoice";
import { useLocale, useTranslations } from "next-intl";
import { formatRon } from "@/domain/invoice/informal-invoice";
import { formatStayPeriod } from "@/lib/ro-calendar";

export function InformalInvoiceView({ ctx }: { ctx: InvoiceContext }) {
  const tInvoice = useTranslations("admin.informalInvoice");
  const locale = useLocale();
  const { invoice, pensionName, pensionAddress } = ctx;
  const issued = new Date().toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function printPage() {
    window.print();
  }

  return (
    <div className="informal-invoice-root mx-auto max-w-2xl">
      <div className="informal-invoice-actions no-print mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={printPage}
          className="informal-invoice-print min-h-[var(--ml-touch-min,2.75rem)] rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {tInvoice("printPdf")}
        </button>
      </div>

      <article className="informal-invoice-sheet overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg ring-1 ring-zinc-900/5 print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-zinc-100 bg-gradient-to-r from-zinc-900 to-zinc-800 px-5 py-5 text-white print:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-200/90">
            {tInvoice("documentInformative")}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">{pensionName}</h1>
          {pensionAddress && (
            <p className="mt-2 text-sm text-zinc-300">{pensionAddress}</p>
          )}
          <p className="mt-4 text-sm text-zinc-400">{tInvoice("issued")}: {issued}</p>
        </header>

        <div className="px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {tInvoice("client")}
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
                {tInvoice("stay")}
              </p>
              <p className="mt-1 font-medium text-zinc-900">
                {formatStayPeriod(invoice.check_in, invoice.check_out, true)}
              </p>
              <p className="text-sm text-zinc-600">
                {invoice.nights} {invoice.nights === 1 ? tInvoice("night") : tInvoice("nights")}
              </p>
            </div>
          </div>

          {invoice.lines.length > 0 ? (
            <>
              <ul className="invoice-line-cards mt-5 space-y-2">
                {invoice.lines.map((line) => (
                  <li
                    key={line.room_id}
                    className="invoice-line-card rounded-xl border border-zinc-200 bg-zinc-50/80 p-3"
                  >
                    <p className="font-medium text-zinc-900">{line.room_name}</p>
                    <p className="text-xs text-zinc-500">{line.building_name}</p>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-zinc-400">
                          {tInvoice("ronPerNight")}
                        </dt>
                        <dd className="mt-0.5 tabular-nums text-zinc-800">
                          {formatRon(line.price_per_night)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-zinc-400">
                          {tInvoice("nightsHeader")}
                        </dt>
                        <dd className="mt-0.5 tabular-nums text-zinc-800">
                          {line.nights}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide text-zinc-400">
                          {tInvoice("total")}
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                          {formatRon(line.line_total)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              <div className="invoice-table-desktop mt-5 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                      <th className="pb-2 pr-4">{tInvoice("room")}</th>
                      <th className="pb-2 pr-4 text-right">{tInvoice("ronPerNight")}</th>
                      <th className="pb-2 pr-4 text-right">{tInvoice("nightsHeader")}</th>
                      <th className="pb-2 text-right">{tInvoice("total")}</th>
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
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-500">
              {tInvoice("allocateRoomsToCalculate")}
            </p>
          )}

          <div className="mt-5 flex flex-col items-end gap-1 border-t border-zinc-200 pt-4">
            {invoice.uses_recorded_total && invoice.total_price !== invoice.subtotal && (
              <p className="text-sm text-zinc-500">
                {tInvoice("roomsEstimate")}: {formatRon(invoice.subtotal)}
              </p>
            )}
            <p className="text-xl font-bold tabular-nums text-zinc-900">
              {tInvoice("total")}:{" "}
              {invoice.total_price != null
                ? formatRon(invoice.total_price)
                : formatRon(invoice.subtotal)}
            </p>
          </div>

          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-2.5 text-xs leading-snug text-amber-950">
            {invoice.disclaimer}
          </p>
        </div>
      </article>
    </div>
  );
}
