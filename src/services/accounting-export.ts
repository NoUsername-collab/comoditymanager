import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";
import { stayNightCount } from "@/lib/stay-dates";
import {
  accountingExportFilename,
  buildAccountingCsv,
  type AccountingExportFormat,
  type AccountingExportRow,
  type AccountingExportSlice,
} from "@/domain/accounting/saga-export";

type PeriodBounds = {
  startIso: string;
  endIso: string;
};

function periodBounds(year: number, month?: number): PeriodBounds {
  if (month != null) {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startIso: start, endIso: end };
  }
  return {
    startIso: `${year}-01-01`,
    endIso: `${year}-12-31`,
  };
}

function lineDescription(lines: unknown): string {
  if (!Array.isArray(lines) || lines.length === 0) return "Cazare";
  const parts = lines
    .map((line) => {
      if (!line || typeof line !== "object") return null;
      const desc = (line as { description?: unknown }).description;
      return typeof desc === "string" && desc.trim() ? desc.trim() : null;
    })
    .filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" | ") : "Cazare";
}

function mapInvoiceRow(
  row: Record<string, unknown>,
  source: "invoice" | "proforma"
): AccountingExportRow {
  return {
    source,
    display_number: String(row.display_number),
    series: String(row.series),
    invoice_number: Number(row.invoice_number),
    issued_at: String(row.issued_at),
    buyer_name: String(row.buyer_name),
    buyer_email: String(row.buyer_email),
    buyer_phone: row.buyer_phone != null ? String(row.buyer_phone) : null,
    seller_cui: row.seller_cui != null ? String(row.seller_cui) : null,
    check_in: String(row.check_in),
    check_out: String(row.check_out),
    description: lineDescription(row.lines),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    booking_id: String(row.booking_id),
  };
}

async function loadFiscalInvoicesForPeriod(
  tenantId: string,
  bounds: PeriodBounds
): Promise<AccountingExportRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_invoices")
    .select(
      "booking_id, series, invoice_number, display_number, issued_at, buyer_name, buyer_email, buyer_phone, seller_cui, check_in, check_out, subtotal, total, lines, invoice_kind"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "issued")
    .neq("invoice_kind", "proforma")
    .gte("issued_at", `${bounds.startIso}T00:00:00.000Z`)
    .lte("issued_at", `${bounds.endIso}T23:59:59.999Z`)
    .order("issued_at", { ascending: true });

  if (error) {
    if (error.message.includes("booking_invoices")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapInvoiceRow(row as Record<string, unknown>, "invoice"));
}

async function loadProformasForPeriod(
  tenantId: string,
  bounds: PeriodBounds
): Promise<AccountingExportRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_invoices")
    .select(
      "booking_id, series, invoice_number, display_number, issued_at, buyer_name, buyer_email, buyer_phone, seller_cui, check_in, check_out, subtotal, total, lines"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "issued")
    .eq("invoice_kind", "proforma")
    .gte("issued_at", `${bounds.startIso}T00:00:00.000Z`)
    .lte("issued_at", `${bounds.endIso}T23:59:59.999Z`)
    .order("issued_at", { ascending: true });

  if (error) {
    if (error.message.includes("booking_invoices")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapInvoiceRow(row as Record<string, unknown>, "proforma")
  );
}

async function loadPaymentsForPeriod(
  tenantId: string,
  bounds: PeriodBounds
): Promise<AccountingExportRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_payments")
    .select(
      `
      id, amount, kind, method, payer_name, paid_at, booking_id,
      bookings ( guest_name, guest_email, guest_phone, check_in, check_out )
    `
    )
    .eq("tenant_id", tenantId)
    .gte("paid_at", `${bounds.startIso}T00:00:00.000Z`)
    .lte("paid_at", `${bounds.endIso}T23:59:59.999Z`)
    .order("paid_at", { ascending: true });

  if (error) {
    if (error.message.includes("booking_payments")) return [];
    throw new Error(error.message);
  }

  const rows: AccountingExportRow[] = [];
  for (const row of data ?? []) {
    const booking = row.bookings as
      | {
          guest_name: string;
          guest_email: string;
          guest_phone: string | null;
          check_in: string;
          check_out: string;
        }
      | {
          guest_name: string;
          guest_email: string;
          guest_phone: string | null;
          check_in: string;
          check_out: string;
        }[]
      | null;
    const b = Array.isArray(booking) ? booking[0] : booking;
    if (!b) continue;

    const amount = Number(row.amount);
    const signedAmount = row.kind === "refund" ? -amount : amount;
    const method = String(row.method ?? "cash");
    const payer =
      row.payer_name != null ? String(row.payer_name).trim() : "";

    rows.push({
      source: "payment",
      display_number: `PL-${String(row.id).slice(0, 8).toUpperCase()}`,
      series: "PL",
      invoice_number: null,
      issued_at: String(row.paid_at),
      buyer_name: payer || String(b.guest_name),
      buyer_email: String(b.guest_email),
      buyer_phone: b.guest_phone != null ? String(b.guest_phone) : null,
      seller_cui: null,
      check_in: String(b.check_in),
      check_out: String(b.check_out),
      description:
        row.kind === "refund"
          ? `Rambursare (${method})`
          : `Incasare (${method})`,
      subtotal: signedAmount,
      total: signedAmount,
      booking_id: String(row.booking_id),
    });
  }

  return rows;
}

async function loadUninvoicedBookingsForPeriod(
  tenantId: string,
  bounds: PeriodBounds,
  invoicedTotalsByBooking: Map<string, number>
): Promise<AccountingExportRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, guest_name, guest_email, guest_phone, check_in, check_out, total_price, confirmed_at,
      booking_rooms ( rooms ( name, building_id, buildings ( name ) ) )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata")
    .gte("check_out", bounds.startIso)
    .lte("check_out", bounds.endIso)
    .order("check_out", { ascending: true });

  if (error) throw new Error(error.message);

  const rows: AccountingExportRow[] = [];
  for (const row of data ?? []) {
    const bookingId = String(row.id);
    const total = row.total_price != null ? Number(row.total_price) : null;
    if (total == null || total <= 0) continue;

    const invoicedTotal = invoicedTotalsByBooking.get(bookingId) ?? 0;
    const remaining = Math.round((total - invoicedTotal) * 100) / 100;
    if (remaining <= 0) continue;

    const br = (row.booking_rooms ?? []) as {
      rooms:
        | { name: string; buildings: { name: string } | { name: string }[] | null }
        | { name: string; buildings: { name: string } | { name: string }[] | null }[]
        | null;
    }[];

    const roomLabels: string[] = [];
    for (const line of br) {
      const r = line.rooms;
      const room = Array.isArray(r) ? r[0] : r;
      if (!room?.name) continue;
      const b = room.buildings;
      const building = Array.isArray(b) ? b[0]?.name : b?.name;
      roomLabels.push(building ? `${room.name} (${building})` : room.name);
    }

    const issuedAt =
      row.confirmed_at != null
        ? String(row.confirmed_at).slice(0, 10)
        : String(row.check_out);

    rows.push({
      source: "booking",
      display_number: `REZ-${bookingId.slice(0, 8).toUpperCase()}`,
      series: "REZ",
      invoice_number: null,
      issued_at: issuedAt,
      buyer_name: String(row.guest_name),
      buyer_email: String(row.guest_email),
      buyer_phone: row.guest_phone != null ? String(row.guest_phone) : null,
      seller_cui: null,
      check_in: String(row.check_in),
      check_out: String(row.check_out),
      description:
        roomLabels.length > 0
          ? `${roomLabels.join(" | ")} — cazare (${stayNightCount(String(row.check_in), String(row.check_out))} nopți)`
          : `Cazare (${stayNightCount(String(row.check_in), String(row.check_out))} nopți)`,
      subtotal: remaining,
      total: remaining,
      booking_id: bookingId,
    });
  }

  return rows;
}

function resolveExportSlice(
  slice?: AccountingExportSlice,
  includeUninvoiced?: boolean
): AccountingExportSlice {
  if (slice) return slice;
  if (includeUninvoiced) return "uninvoiced";
  return "fiscal";
}

export async function loadAccountingExportRows(input: {
  year: number;
  month?: number;
  slice?: AccountingExportSlice;
  /** @deprecated use slice=uninvoiced */
  includeUninvoiced?: boolean;
}): Promise<AccountingExportRow[]> {
  const { tenantId } = await getTenantScope();
  const bounds = periodBounds(input.year, input.month);
  const slice = resolveExportSlice(input.slice, input.includeUninvoiced);

  if (slice === "proforma") {
    return loadProformasForPeriod(tenantId, bounds);
  }

  if (slice === "payments") {
    return loadPaymentsForPeriod(tenantId, bounds);
  }

  if (slice === "uninvoiced") {
    const fiscal = await loadFiscalInvoicesForPeriod(tenantId, bounds);
    const invoicedTotalsByBooking = new Map<string, number>();
    for (const row of fiscal) {
      const prev = invoicedTotalsByBooking.get(row.booking_id) ?? 0;
      invoicedTotalsByBooking.set(
        row.booking_id,
        Math.round((prev + row.total) * 100) / 100
      );
    }
    return loadUninvoicedBookingsForPeriod(
      tenantId,
      bounds,
      invoicedTotalsByBooking
    );
  }

  return loadFiscalInvoicesForPeriod(tenantId, bounds);
}

export async function loadAccountingExportCsv(input: {
  year: number;
  month?: number;
  format: AccountingExportFormat;
  slice?: AccountingExportSlice;
  /** @deprecated use slice=uninvoiced */
  includeUninvoiced?: boolean;
}): Promise<{ csv: string; filename: string; rowCount: number }> {
  const slice = resolveExportSlice(input.slice, input.includeUninvoiced);
  const rows = await loadAccountingExportRows({ ...input, slice });
  return {
    csv: buildAccountingCsv(rows, input.format),
    filename: accountingExportFilename(input.format, input.year, input.month, slice),
    rowCount: rows.length,
  };
}
