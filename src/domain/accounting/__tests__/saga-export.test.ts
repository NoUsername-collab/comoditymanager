import { describe, it, expect } from "vitest";
import {
  accountingExportFilename,
  buildAccountingCsv,
  escapeCsvField,
  formatRomanianDate,
  type AccountingExportRow,
} from "@/domain/accounting/saga-export";

const sampleRow: AccountingExportRow = {
  source: "invoice",
  display_number: "HSP-0001",
  series: "HSP",
  invoice_number: 1,
  issued_at: "2025-06-15T10:00:00.000Z",
  buyer_name: "Ion Popescu",
  buyer_email: "ion@example.com",
  buyer_phone: "0712345678",
  seller_cui: "RO12345678",
  check_in: "2025-06-10",
  check_out: "2025-06-12",
  description: "Camera 1 (Vila) — cazare",
  subtotal: 500,
  total: 500,
  booking_id: "booking-1",
};

describe("formatRomanianDate", () => {
  it("formats ISO dates as DD.MM.YYYY", () => {
    expect(formatRomanianDate("2025-06-15")).toBe("15.06.2025");
  });
});

describe("escapeCsvField", () => {
  it("quotes values containing separators", () => {
    expect(escapeCsvField("A;B")).toBe('"A;B"');
  });
});

describe("accountingExportFilename", () => {
  it("includes slice in filename", () => {
    expect(accountingExportFilename("saga", 2026, 3, "proforma")).toBe(
      "saga-proforme-2026-03.csv"
    );
    expect(accountingExportFilename("saga", 2026, undefined, "payments")).toBe(
      "saga-plati-2026.csv"
    );
  });
});

describe("buildAccountingCsv", () => {
  it("builds Saga CSV with BOM and semicolon separator", () => {
    const csv = buildAccountingCsv([sampleRow], "saga");
    expect(csv.startsWith("\uFEFFTip document;Serie;Numar")).toBe(true);
    expect(csv).toContain("Ion Popescu");
    expect(csv).toContain("500,00");
    expect(csv).toContain("15.06.2025");
  });

  it("builds ContaPlus headers", () => {
    const csv = buildAccountingCsv([sampleRow], "contaplus");
    expect(csv).toContain("TIP_DOC;SERIE;NR_DOC");
    expect(csv).toContain("FACTURA");
  });

  it("marks proforma rows as PF", () => {
    const csv = buildAccountingCsv(
      [{ ...sampleRow, source: "proforma", series: "PF", display_number: "PF-0001" }],
      "saga"
    );
    expect(csv).toContain("PF;");
    expect(csv).toContain("Proforma");
  });

  it("marks payment rows as IP", () => {
    const csv = buildAccountingCsv(
      [
        {
          ...sampleRow,
          source: "payment",
          series: "PL",
          display_number: "PL-ABC",
          invoice_number: null,
          description: "Incasare (cash)",
        },
      ],
      "saga"
    );
    expect(csv).toContain("IP;");
    expect(csv).toContain("Incasare");
  });
});
