export type AccountingExportFormat = "saga" | "contaplus";

export type AccountingExportSlice =
  | "fiscal"
  | "proforma"
  | "payments"
  | "uninvoiced";

export type AccountingExportRow = {
  source: "invoice" | "booking" | "proforma" | "payment";
  display_number: string;
  series: string;
  invoice_number: number | null;
  issued_at: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  seller_cui: string | null;
  check_in: string;
  check_out: string;
  description: string;
  subtotal: number;
  total: number;
  booking_id: string;
};

const CSV_SEP = ";";

export function formatRomanianDate(iso: string): string {
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return datePart;
  return `${d}.${m}.${y}`;
}

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(CSV_SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatAmount(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function sagaHeaders(): string[] {
  return [
    "Tip document",
    "Serie",
    "Numar",
    "Data",
    "Client",
    "Email",
    "Telefon",
    "CUI client",
    "Check-in",
    "Check-out",
    "Descriere",
    "Valoare",
    "Total",
    "Moneda",
    "Sursa",
    "ID rezervare",
  ];
}

function contaplusHeaders(): string[] {
  return [
    "TIP_DOC",
    "SERIE",
    "NR_DOC",
    "DATA",
    "PARTENER",
    "EMAIL",
    "TELEFON",
    "CUI",
    "DATA_IN",
    "DATA_OUT",
    "EXPLICATIE",
    "VALOARE",
    "TOTAL",
    "MONEDA",
    "SURSA",
    "ID_REZ",
  ];
}

function rowToCells(row: AccountingExportRow, format: AccountingExportFormat): string[] {
  const docType =
    row.source === "invoice"
      ? "FF"
      : row.source === "proforma"
        ? "PF"
        : row.source === "payment"
          ? "IP"
          : "NC";
  const date = formatRomanianDate(row.issued_at);
  const amount = formatAmount(row.subtotal);
  const total = formatAmount(row.total);
  const number =
    row.invoice_number != null ? String(row.invoice_number) : row.display_number;

  const sourceLabel =
    row.source === "invoice"
      ? format === "contaplus"
        ? "FACTURA"
        : "Factura emisa"
      : row.source === "proforma"
        ? format === "contaplus"
          ? "PROFORMA"
          : "Proforma"
        : row.source === "payment"
          ? format === "contaplus"
            ? "PLATA"
            : "Incasare"
          : format === "contaplus"
            ? "REZERVARE"
            : "Rezervare nefacturata";

  if (format === "contaplus") {
    return [
      docType,
      row.series,
      number,
      date,
      row.buyer_name,
      row.buyer_email,
      row.buyer_phone ?? "",
      row.seller_cui ?? "",
      formatRomanianDate(row.check_in),
      formatRomanianDate(row.check_out),
      row.description,
      amount,
      total,
      "RON",
      sourceLabel,
      row.booking_id,
    ];
  }

  return [
    docType,
    row.series,
    number,
    date,
    row.buyer_name,
    row.buyer_email,
    row.buyer_phone ?? "",
    row.seller_cui ?? "",
    formatRomanianDate(row.check_in),
    formatRomanianDate(row.check_out),
    row.description,
    amount,
    total,
    "RON",
    sourceLabel,
    row.booking_id,
  ];
}

export function buildAccountingCsv(
  rows: AccountingExportRow[],
  format: AccountingExportFormat
): string {
  const headers = format === "contaplus" ? contaplusHeaders() : sagaHeaders();
  const lines = [
    headers.map(escapeCsvField).join(CSV_SEP),
    ...rows.map((row) =>
      rowToCells(row, format).map(escapeCsvField).join(CSV_SEP)
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function accountingExportFilename(
  format: AccountingExportFormat,
  year: number,
  month?: number,
  slice: AccountingExportSlice = "fiscal"
): string {
  const base = format === "contaplus" ? "contaplus" : "saga";
  const sliceTag =
    slice === "fiscal"
      ? "iesiri"
      : slice === "proforma"
        ? "proforme"
        : slice === "payments"
          ? "plati"
          : "nefacturat";
  if (month != null) {
    return `${base}-${sliceTag}-${year}-${String(month).padStart(2, "0")}.csv`;
  }
  return `${base}-${sliceTag}-${year}.csv`;
}
