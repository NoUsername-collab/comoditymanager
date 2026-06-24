import { describe, expect, it } from "vitest";
import { resolveCheckinPaymentFromLedger } from "@/domain/checkin/payment-panel";
import {
  computePaymentTotals,
  paymentDeltaToTarget,
  sumLedgerPayments,
} from "../ledger";
import type { PaymentEntry } from "../types";

function entry(
  partial: Partial<PaymentEntry> & Pick<PaymentEntry, "amount" | "kind">
): PaymentEntry {
  return {
    id: "1",
    booking_id: "b1",
    method: "cash",
    payer_name: null,
    payer_tax_id: null,
    paid_at: "2026-06-01T10:00:00Z",
    recorded_by: null,
    notes: null,
    invoice_id: null,
    ...partial,
  };
}

describe("sumLedgerPayments", () => {
  it("sums payments and subtracts refunds", () => {
    const entries = [
      entry({ amount: 400, kind: "payment" }),
      entry({ amount: 100, kind: "refund" }),
      entry({ amount: 300, kind: "payment" }),
    ];
    expect(sumLedgerPayments(entries)).toBe(600);
  });
});

describe("computePaymentTotals", () => {
  it("derives partial and paid", () => {
    const partial = computePaymentTotals(1200, [
      entry({ amount: 400, kind: "payment" }),
    ]);
    expect(partial.totalPaid).toBe(400);
    expect(partial.balanceDue).toBe(800);
    expect(partial.derivedStatus).toBe("partial");

    const paid = computePaymentTotals(1200, [
      entry({ amount: 1200, kind: "payment" }),
    ]);
    expect(paid.derivedStatus).toBe("paid");
    expect(paid.balanceDue).toBe(0);
  });
});

describe("paymentDeltaToTarget", () => {
  it("returns payment or refund delta", () => {
    const entries = [entry({ amount: 400, kind: "payment" })];
    expect(paymentDeltaToTarget(entries, 600)).toEqual({
      kind: "payment",
      amount: 200,
    });
    expect(paymentDeltaToTarget(entries, 300)).toEqual({
      kind: "refund",
      amount: 100,
    });
    expect(paymentDeltaToTarget(entries, 400)).toBeNull();
  });
});

describe("resolveCheckinPaymentFromLedger", () => {
  it("prefers ledger totals over stale check-in snapshot", () => {
    const resolved = resolveCheckinPaymentFromLedger(
      600,
      { paymentStatus: "unpaid", paymentAmountPaid: 0 },
      [entry({ amount: 600, kind: "payment" })],
    );
    expect(resolved).toEqual({
      paymentStatus: "paid",
      paymentAmountPaid: 600,
      fromLedger: true,
    });
  });
});
