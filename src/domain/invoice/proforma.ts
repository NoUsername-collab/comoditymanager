import { roundMoney } from "@/domain/payments/ledger";
import type { InvoiceKind } from "./invoice-allocation";

const MONEY_EPS = 0.005;

export type BookingDocumentKind = InvoiceKind | "proforma";

export function isFiscalInvoiceKind(
  kind: BookingDocumentKind
): kind is InvoiceKind {
  return kind !== "proforma";
}

export function formatProformaDisplayNumber(
  series: string,
  number: number
): string {
  return `${series}-${String(number).padStart(4, "0")}`;
}

export function canConvertProforma(input: {
  proformaTotal: number;
  totalPaid: number;
  remainingToInvoice: number;
  convertedToInvoiceId: string | null;
  status: "issued" | "void";
}): { ok: true } | { ok: false; reason: string } {
  if (input.status !== "issued") {
    return { ok: false, reason: "proforma.not_active" };
  }
  if (input.convertedToInvoiceId != null) {
    return { ok: false, reason: "proforma.already_converted" };
  }
  const total = roundMoney(input.proformaTotal);
  if (total <= MONEY_EPS) {
    return { ok: false, reason: "proforma.invalid_amount" };
  }
  if (roundMoney(input.totalPaid) + MONEY_EPS < total) {
    return { ok: false, reason: "proforma.payment_insufficient" };
  }
  if (roundMoney(input.remainingToInvoice) + MONEY_EPS < total) {
    return { ok: false, reason: "proforma.exceeds_remaining" };
  }
  return { ok: true };
}

export function resolveDefaultProformaAmount(input: {
  remainingToInvoice: number;
  uninvoicedPaid: number;
}): number {
  if (input.uninvoicedPaid > MONEY_EPS) {
    return roundMoney(
      Math.min(input.uninvoicedPaid, input.remainingToInvoice)
    );
  }
  return input.remainingToInvoice;
}

export function validateProformaAmount(
  amount: number,
  remainingToInvoice: number
): { ok: true; amount: number } | { ok: false; error: string } {
  const normalized = roundMoney(amount);
  if (!Number.isFinite(normalized) || normalized <= MONEY_EPS) {
    return { ok: false, error: "proforma.invalid_amount" };
  }
  if (normalized > remainingToInvoice + MONEY_EPS) {
    return { ok: false, error: "proforma.amount_exceeds_remaining" };
  }
  return { ok: true, amount: normalized };
}

export function nextProformaSequence(
  proformas: Array<{ invoice_sequence: number }>
): number {
  if (proformas.length === 0) return 1;
  return Math.max(...proformas.map((p) => p.invoice_sequence)) + 1;
}
