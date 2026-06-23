import { roundMoney } from "@/domain/payments/ledger";
import type { PaymentEntry } from "@/domain/payments/types";

const MONEY_EPS = 0.005;

export type InvoiceKind = "advance" | "partial" | "final" | "credit_note";

export type IssuedInvoiceSummary = {
  id: string;
  total: number;
  status: "issued" | "void";
  invoice_kind: InvoiceKind | "proforma";
  invoice_sequence: number;
};

export type InvoiceFinancials = {
  totalDue: number;
  totalPaid: number;
  totalInvoiced: number;
  remainingToInvoice: number;
  uninvoicedPaid: number;
};

export function sumIssuedInvoiceTotals(
  invoices: Array<{
    total?: number;
    status: string;
    invoice_kind?: string;
    document?: { total: number };
  }>
): number {
  const total = invoices
    .filter((inv) => inv.status === "issued")
    .filter((inv) => {
      if ("invoice_kind" in inv && inv.invoice_kind === "proforma") {
        return false;
      }
      return true;
    })
    .reduce((sum, inv) => {
      const amount =
        inv.total != null
          ? inv.total
          : inv.document?.total ?? 0;
      return sum + roundMoney(Number(amount) || 0);
    }, 0);
  return roundMoney(total);
}

export function computeInvoiceFinancials(
  totalDue: number,
  totalPaid: number,
  totalInvoiced: number
): InvoiceFinancials {
  const due = roundMoney(Math.max(0, totalDue));
  const paid = roundMoney(Math.max(0, totalPaid));
  const invoiced = roundMoney(Math.max(0, totalInvoiced));
  const remainingToInvoice = roundMoney(Math.max(0, due - invoiced));
  const uninvoicedPaid = roundMoney(Math.max(0, paid - invoiced));
  return {
    totalDue: due,
    totalPaid: paid,
    totalInvoiced: invoiced,
    remainingToInvoice,
    uninvoicedPaid,
  };
}

export function resolveNextInvoiceKind(input: {
  totalDue: number;
  totalInvoiced: number;
  invoiceAmount: number;
  issuedCount: number;
}): InvoiceKind {
  const due = roundMoney(Math.max(0, input.totalDue));
  const invoiced = roundMoney(Math.max(0, input.totalInvoiced));
  const amount = roundMoney(Math.max(0, input.invoiceAmount));
  const after = roundMoney(invoiced + amount);

  if (after + MONEY_EPS >= due) return "final";
  if (input.issuedCount === 0) return "advance";
  return "partial";
}

export function resolveDefaultInvoiceAmount(
  financials: Pick<InvoiceFinancials, "remainingToInvoice" | "uninvoicedPaid">
): number {
  if (financials.uninvoicedPaid > MONEY_EPS) {
    return roundMoney(
      Math.min(financials.uninvoicedPaid, financials.remainingToInvoice)
    );
  }
  return financials.remainingToInvoice;
}

export function validateInvoiceAmount(
  amount: number,
  remainingToInvoice: number
): { ok: true; amount: number } | { ok: false; error: string } {
  const normalized = roundMoney(amount);
  if (!Number.isFinite(normalized) || normalized <= MONEY_EPS) {
    return { ok: false, error: "invoice.invalid_amount" };
  }
  if (normalized > remainingToInvoice + MONEY_EPS) {
    return { ok: false, error: "invoice.amount_exceeds_remaining" };
  }
  return { ok: true, amount: normalized };
}

export function nextInvoiceSequence(
  invoices: Pick<IssuedInvoiceSummary, "invoice_sequence">[]
): number {
  if (invoices.length === 0) return 1;
  return Math.max(...invoices.map((inv) => inv.invoice_sequence)) + 1;
}

/** Aloca plati nefacturate (FIFO) pana la suma facturii. */
export function paymentsToLinkForInvoice(
  payments: PaymentEntry[],
  invoiceAmount: number
): string[] {
  let remaining = roundMoney(invoiceAmount);
  const ids: string[] = [];

  for (const payment of payments) {
    if (remaining <= MONEY_EPS) break;
    if (payment.invoice_id != null) continue;
    if (payment.kind !== "payment") continue;

    const amount = roundMoney(payment.amount);
    if (amount <= MONEY_EPS) continue;

    ids.push(payment.id);
    remaining = roundMoney(remaining - amount);
  }

  return ids;
}

export function invoiceKindLabelKey(
  kind: InvoiceKind | "proforma"
): string {
  switch (kind) {
    case "advance":
      return "kindAdvance";
    case "partial":
      return "kindPartial";
    case "final":
      return "kindFinal";
    case "credit_note":
      return "kindCreditNote";
    case "proforma":
      return "kindProforma";
  }
}