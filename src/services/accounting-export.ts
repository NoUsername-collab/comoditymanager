import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";
import { stayNightCount } from "@/lib/stay-dates";
import {
  accountingExportFilename,
  buildAccountingCsv,
  type AccountingExportFormat,
  type AccountingExportRow,
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

function mapInvoiceRow(row: Record<string, unknown>): AccountingExportRow {
  return {
    source: "invoice",
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

async function loadIssuedInvoicesForPeriod(
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
    .gte("issued_at", `${bounds.startIso}T00:00:00.000Z`)
    .lte("issued_at", `${bounds.endIso}T23:59:59.999Z`)
    .order("issued_at", { ascending: true });

  if (error) {
    if (error.message.includes("booking_invoices")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapInvoiceRow(row as Record<string, unknown>));
}

async function loadUninvoicedBookingsForPeriod(
  tenantId: string,
  bounds: PeriodBounds,
  invoicedBookingIds: Set<string>
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
    if (invoicedBookingIds.has(bookingId)) continue;
    const total = row.total_price != null ? Number(row.total_price) : null;
    if (total == null || total <= 0) continue;

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
      subtotal: total,
      total,
      booking_id: bookingId,
    });
  }

  return rows;
}

export async function loadAccountingExportRows(input: {
  year: number;
  month?: number;
  includeUninvoiced?: boolean;
}): Promise<AccountingExportRow[]> {
  const { tenantId } = await getTenantScope();
  const bounds = periodBounds(input.year, input.month);
  const invoices = await loadIssuedInvoicesForPeriod(tenantId, bounds);

  if (!input.includeUninvoiced) return invoices;

  const invoicedIds = new Set(invoices.map((row) => row.booking_id));
  const uninvoiced = await loadUninvoicedBookingsForPeriod(
    tenantId,
    bounds,
    invoicedIds
  );
  return [...invoices, ...uninvoiced].sort((a, b) =>
    a.issued_at.localeCompare(b.issued_at)
  );
}

export async function loadAccountingExportCsv(input: {
  year: number;
  month?: number;
  format: AccountingExportFormat;
  includeUninvoiced?: boolean;
}): Promise<{ csv: string; filename: string; rowCount: number }> {
  const rows = await loadAccountingExportRows(input);
  return {
    csv: buildAccountingCsv(rows, input.format),
    filename: accountingExportFilename(input.format, input.year, input.month),
    rowCount: rows.length,
  };
}
