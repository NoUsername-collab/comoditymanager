import { describe, expect, it } from "vitest";
import {
  computeVatBreakdown,
  resolveInvoiceVatRate,
} from "@/domain/fiscal/country-fiscal-profile";

describe("computeVatBreakdown", () => {
  it("extracts VAT when prices include VAT", () => {
    const result = computeVatBreakdown(108, 8, {
      enabled: true,
      pricesIncludeVat: true,
    });
    expect(result.gross).toBe(108);
    expect(result.net).toBe(100);
    expect(result.vat).toBe(8);
  });

  it("adds VAT when prices exclude VAT", () => {
    const result = computeVatBreakdown(100, 9, {
      enabled: true,
      pricesIncludeVat: false,
    });
    expect(result.net).toBe(100);
    expect(result.vat).toBe(9);
    expect(result.gross).toBe(109);
  });

  it("returns zero VAT when disabled", () => {
    const result = computeVatBreakdown(250, 9, {
      enabled: false,
      pricesIncludeVat: true,
    });
    expect(result.vat).toBe(0);
    expect(result.gross).toBe(250);
  });
});

describe("resolveInvoiceVatRate", () => {
  it("uses country default when unset", () => {
    expect(resolveInvoiceVatRate("MD", null)).toBe(8);
    expect(resolveInvoiceVatRate("BG", null)).toBe(9);
    expect(resolveInvoiceVatRate("RO", null)).toBe(9);
  });

  it("respects configured rate", () => {
    expect(resolveInvoiceVatRate("RO", 11)).toBe(11);
  });
});
