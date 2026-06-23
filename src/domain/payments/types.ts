/** Ledger payment kinds stored in booking_payments (fara DB). */

export type PaymentLedgerKind = "payment" | "refund";

export type PaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "online"
  | "other";

export type DerivedPaymentStatus = "unpaid" | "partial" | "paid";

export type PaymentEntry = {
  id: string;
  booking_id: string;
  amount: number;
  kind: PaymentLedgerKind;
  method: PaymentMethod;
  payer_name: string | null;
  payer_tax_id: string | null;
  paid_at: string;
  recorded_by: string | null;
  notes: string | null;
  invoice_id: string | null;
};

export type PaymentTotals = {
  totalDue: number;
  totalPaid: number;
  balanceDue: number;
  derivedStatus: DerivedPaymentStatus;
};

export type FinancialSnapshot = PaymentTotals & {
  totalInvoiced: number;
  uninvoicedPaid: number;
  remainingToInvoice: number;
  payments: PaymentEntry[];
};