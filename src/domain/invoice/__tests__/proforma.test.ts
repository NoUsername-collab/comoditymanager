import { describe, expect, it } from "vitest";
import {
  canConvertProforma,
  formatProformaDisplayNumber,
  resolveDefaultProformaAmount,
  validateProformaAmount,
} from "../proforma";
import { sumIssuedInvoiceTotals } from "../invoice-allocation";

describe("formatProformaDisplayNumber", () => {
  it("pads series number to 4 digits", () => {
    expect(formatProformaDisplayNumber("PF", 7)).toBe("PF-0007");
    expect(formatProformaDisplayNumber("PF", 1234)).toBe("PF-1234");
  });
});

describe("validateProformaAmount", () => {
  it("rejects amounts above remaining", () => {
    expect(validateProformaAmount(900, 800)).toEqual({
      ok: false,
      error: "proforma.amount_exceeds_remaining",
    });
  });

  it("accepts valid amount", () => {
    expect(validateProformaAmount(400, 800)).toEqual({
      ok: true,
      amount: 400,
    });
  });
});

describe("resolveDefaultProformaAmount", () => {
  it("prefers uninvoiced paid", () => {
    expect(
      resolveDefaultProformaAmount({
        remainingToInvoice: 800,
        uninvoicedPaid: 300,
      })
    ).toBe(300);
  });
});

describe("canConvertProforma", () => {
  it("requires payment coverage", () => {
    expect(
      canConvertProforma({
        proformaTotal: 500,
        totalPaid: 400,
        remainingToInvoice: 800,
        convertedToInvoiceId: null,
        status: "issued",
      })
    ).toEqual({ ok: false, reason: "proforma.payment_insufficient" });
  });

  it("allows conversion when paid and room remain", () => {
    expect(
      canConvertProforma({
        proformaTotal: 500,
        totalPaid: 600,
        remainingToInvoice: 800,
        convertedToInvoiceId: null,
        status: "issued",
      })
    ).toEqual({ ok: true });
  });

  it("blocks already converted", () => {
    expect(
      canConvertProforma({
        proformaTotal: 500,
        totalPaid: 600,
        remainingToInvoice: 800,
        convertedToInvoiceId: "inv-1",
        status: "issued",
      })
    ).toEqual({ ok: false, reason: "proforma.already_converted" });
  });
});

describe("sumIssuedInvoiceTotals excludes proforma", () => {
  it("ignores proforma rows in fiscal totals", () => {
    expect(
      sumIssuedInvoiceTotals([
        { total: 400, status: "issued", invoice_kind: "advance" },
        { total: 300, status: "issued", invoice_kind: "proforma" },
      ])
    ).toBe(400);
  });
});
