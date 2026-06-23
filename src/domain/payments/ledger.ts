import type {
  DerivedPaymentStatus,
  PaymentEntry,
  PaymentLedgerKind,
  PaymentTotals,
} from "./types";

const MONEY_EPS = 0.005;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function signedLedgerAmount(entry: Pick<PaymentEntry, "amount" | "kind">): number {
  const n = roundMoney(Number(entry.amount) || 0);
  return entry.kind === "refund" ? -n : n;
}

export function sumLedgerPayments(entries: PaymentEntry[]): number {
  const total = entries.reduce((sum, e) => sum + signedLedgerAmount(e), 0);
  return roundMoney(Math.max(0, total));
}

export function derivePaymentStatus(
  totalDue: number,
  totalPaid: number
): DerivedPaymentStatus {
  const due = roundMoney(Math.max(0, totalDue));
  const paid = roundMoney(Math.max(0, totalPaid));
  if (due <= MONEY_EPS) return "paid";
  if (paid <= MONEY_EPS) return "unpaid";
  if (paid + MONEY_EPS >= due) return "paid";
  return "partial";
}

export function computePaymentTotals(
  totalDue: number,
  entries: PaymentEntry[]
): PaymentTotals {
  const totalPaid = sumLedgerPayments(entries);
  const due = roundMoney(Math.max(0, totalDue));
  const balanceDue = roundMoney(Math.max(0, due - totalPaid));
  return {
    totalDue: due,
    totalPaid,
    balanceDue,
    derivedStatus: derivePaymentStatus(due, totalPaid),
  };
}

export function paymentDeltaToTarget(
  entries: PaymentEntry[],
  targetPaid: number
): { kind: PaymentLedgerKind; amount: number } | null {
  const current = sumLedgerPayments(entries);
  const target = roundMoney(Math.max(0, targetPaid));
  const delta = roundMoney(target - current);
  if (Math.abs(delta) < MONEY_EPS) return null;
  if (delta > 0) return { kind: "payment", amount: delta };
  return { kind: "refund", amount: roundMoney(-delta) };
}
