import { describe, expect, it } from "vitest";
import {
  computeInvoiceFinancials,
  paymentsToLinkForInvoice,
  resolveDefaultInvoiceAmount,
  resolveNextInvoiceKind,
  sumIssuedInvoiceTotals,
  validateInvoiceAmount,
} from "../invoice-allocation";
import type { PaymentEntry } from "@/domain/payments/types";

describe("sumIssuedInvoiceTotals", () => {
  it("sums only issued invoices", () => {
    expect(
      sumIssuedInvoiceTotals([
        { total: 400, status: "issued" },
        { total: 800, status: "issued" },
        { total: 100, status: "void" },
      ])
    ).toBe(1200);
  });
});

describe("computeInvoiceFinancials", () => {
  it("computes uninvoiced paid and remaining", () => {
    const f = computeInvoiceFinancials(1200, 600, 400);
    expect(f.remainingToInvoice).toBe(800);
    expect(f.uninvoicedPaid).toBe(200);
  });
});

describe("resolveNextInvoiceKind", () => {
  it("returns advance for first partial", () => {
    expect(
      resolveNextInvoiceKind({
        totalDue: 1200,
        totalInvoiced: 0,
        invoiceAmount: 400,
        issuedCount: 0,
      })
    ).toBe("advance");
  });

  it("returns final when covering remainder", () => {
    expect(
      resolveNextInvoiceKind({
        totalDue: 1200,
        totalInvoiced: 400,
        invoiceAmount: 800,
        issuedCount: 1,
      })
    ).toBe("final");
  });

  it("returns partial for middle invoices", () => {
    expect(
      resolveNextInvoiceKind({
        totalDue: 1200,
        totalInvoiced: 400,
        invoiceAmount: 300,
        issuedCount: 1,
      })
    ).toBe("partial");
  });
});

describe("resolveDefaultInvoiceAmount", () => {
  it("prefers uninvoiced paid when positive", () => {
    expect(
      resolveDefaultInvoiceAmount({
        remainingToInvoice: 800,
        uninvoicedPaid: 400,
      })
    ).toBe(400);
  });

  it("falls back to remaining when nothing paid ahead", () => {
    expect(
      resolveDefaultInvoiceAmount({
        remainingToInvoice: 1200,
        uninvoicedPaid: 0,
      })
    ).toBe(1200);
  });
});

describe("validateInvoiceAmount", () => {
  it("rejects over-remaining", () => {
    expect(validateInvoiceAmount(900, 800)).toEqual({
      ok: false,
      error: "invoice.amount_exceeds_remaining",
    });
  });
});

describe("paymentsToLinkForInvoice", () => {
  const base: PaymentEntry = {
    id: "x",
    booking_id: "b1",
    amount: 0,
    kind: "payment",
    method: "cash",
    payer_name: null,
    payer_tax_id: null,
    paid_at: "2026-06-01",
    recorded_by: null,
    notes: null,
    invoice_id: null,
  };

  it("links unlinked payments FIFO", () => {
    const ids = paymentsToLinkForInvoice(
      [
        { ...base, id: "p1", amount: 300 },
        { ...base, id: "p2", amount: 200, invoice_id: "inv1" },
        { ...base, id: "p3", amount: 250 },
      ],
      400
    );
    expect(ids).toEqual(["p1", "p3"]);
  });
});