import { cache } from "react";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { stayNightCount } from "@/lib/stay-dates";
import {
  buildAllocatedInvoiceDocument,
  buildIssuedInvoiceDocument,
  type IssuedInvoiceDocument,
} from "@/domain/invoice/issued-invoice";
import {
  computeInvoiceFinancials,
  nextInvoiceSequence,
  paymentsToLinkForInvoice,
  resolveDefaultInvoiceAmount,
  resolveNextInvoiceKind,
  sumIssuedInvoiceTotals,
  validateInvoiceAmount,
  type InvoiceKind,
} from "@/domain/invoice/invoice-allocation";
import { sumLedgerPayments } from "@/domain/payments/ledger";
import { getBookingById } from "@/services/bookings";
import { listBookingPayments } from "@/services/booking-payments";
import { getCheckinSettings } from "@/services/checkin";
import {
  getBookingRulesSettings,
  getStayPricingRules,
} from "@/services/booking-rules-settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getRoomsByIds } from "@/services/rooms-admin";
import { getTenantDisplayName } from "@/services/tenants";
import { enqueueFiscalSubmission } from "@/services/fiscal-submission";
import { getLocale } from "next-intl/server";
import { resolveTenantCountryForRequest } from "@/lib/tenant/resolve-fiscal-tenant";

export type IssuedInvoiceRecord = {
  id: string;
  booking_id: string;
  invoice_kind: InvoiceKind;
  invoice_sequence: number;
  status: "issued" | "void";
  document: IssuedInvoiceDocument;
};

function parseInvoiceKind(value: unknown): InvoiceKind {
  if (
    value === "advance" ||
    value === "partial" ||
    value === "final" ||
    value === "credit_note"
  ) {
    return value;
  }
  return "final";
}

function mapInvoiceRow(row: Record<string, unknown>): IssuedInvoiceRecord {
  const lines = Array.isArray(row.lines) ? row.lines : [];
  const currency =
    row.currency === "BGN" || row.currency === "MDL" ? row.currency : "RON";
  const vatRate = row.vat_rate != null ? Number(row.vat_rate) : 0;
  const vatAmount = row.vat_amount != null ? Number(row.vat_amount) : 0;
  const subtotalNet =
    row.subtotal_net != null ? Number(row.subtotal_net) : Number(row.subtotal);
  const document: IssuedInvoiceDocument = {
    series: String(row.series),
    invoice_number: Number(row.invoice_number),
    display_number: String(row.display_number),
    issued_at: String(row.issued_at),
    seller_name: String(row.seller_name),
    seller_cui: row.seller_cui != null ? String(row.seller_cui) : null,
    seller_reg_com:
      row.seller_reg_com != null ? String(row.seller_reg_com) : null,
    seller_address:
      row.seller_address != null ? String(row.seller_address) : null,
    buyer_name: String(row.buyer_name),
    buyer_email: String(row.buyer_email),
    buyer_phone: row.buyer_phone != null ? String(row.buyer_phone) : null,
    check_in: String(row.check_in),
    check_out: String(row.check_out),
    nights: stayNightCount(String(row.check_in), String(row.check_out)),
    lines: lines as IssuedInvoiceDocument["lines"],
    subtotal: Number(row.subtotal),
    subtotal_net: subtotalNet,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total: Number(row.total),
    currency,
    prices_include_vat: vatAmount > 0 ? true : true,
    uses_recorded_total: false,
    legal_note: "",
  };
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    invoice_kind: parseInvoiceKind(row.invoice_kind),
    invoice_sequence:
      row.invoice_sequence != null ? Number(row.invoice_sequence) : 1,
    status: row.status === "void" ? "void" : "issued",
    document,
  };
}

function isBookingInvoicesTableMissing(message: string): boolean {
  return message.includes("booking_invoices");
}

export const listBookingInvoices = cache(async (
  bookingId: string
): Promise<IssuedInvoiceRecord[]> => {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .eq("status", "issued")
    .neq("invoice_kind", "proforma")
    .order("invoice_sequence", { ascending: true });

  if (error) {
    if (isBookingInvoicesTableMissing(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapInvoiceRow(row as Record<string, unknown>)
  );
});

/** Ultima factură emisă (compatibilitate P1). */
export const loadActiveBookingInvoice = cache(async (
  bookingId: string
): Promise<IssuedInvoiceRecord | null> => {
  const invoices = await listBookingInvoices(bookingId);
  if (invoices.length === 0) return null;
  return invoices[invoices.length - 1] ?? null;
});

export async function sumBookingInvoicedTotal(
  bookingId: string
): Promise<number> {
  const invoices = await listBookingInvoices(bookingId);
  return sumIssuedInvoiceTotals(invoices);
}

export type IssueBookingInvoiceOptions = {
  amount?: number;
};

export async function issueBookingInvoice(
  bookingId: string,
  options?: IssueBookingInvoiceOptions
): Promise<{ ok: true; invoice: IssuedInvoiceRecord } | { ok: false; error: string }> {
  const [
    booking,
    pension,
    checkinSettings,
    bookingRules,
    pricingRules,
    locale,
    tenantId,
    tenantCountry,
    existingInvoices,
    payments,
  ] = await Promise.all([
    getBookingById(bookingId),
    getPensionSettings(),
    getCheckinSettings(),
    getBookingRulesSettings(),
    getStayPricingRules(),
    getLocale(),
    resolveTenantIdForData(),
    resolveTenantCountryForRequest(),
    listBookingInvoices(bookingId),
    listBookingPayments(bookingId),
  ]);

  if (!booking) return { ok: false, error: "booking.not_found" };
  if (booking.status !== "confirmata") {
    return { ok: false, error: "invoice.booking_not_confirmed" };
  }
  if (booking.room_ids.length === 0) {
    return { ok: false, error: "invoice.no_rooms" };
  }

  const totalDue = Math.max(0, Number(booking.total_price ?? 0));
  const totalPaid = sumLedgerPayments(payments);
  const totalInvoiced = sumIssuedInvoiceTotals(existingInvoices);
  const financials = computeInvoiceFinancials(totalDue, totalPaid, totalInvoiced);

  if (financials.remainingToInvoice <= 0) {
    return { ok: false, error: "invoice.fully_invoiced" };
  }

  const defaultAmount = resolveDefaultInvoiceAmount(financials);
  const requestedAmount = options?.amount ?? defaultAmount;
  const amountCheck = validateInvoiceAmount(
    requestedAmount,
    financials.remainingToInvoice
  );
  if (!amountCheck.ok) return amountCheck;

  const invoiceAmount = amountCheck.amount;
  const issuedCount = existingInvoices.length;
  const invoiceKind = resolveNextInvoiceKind({
    totalDue,
    totalInvoiced,
    invoiceAmount,
    issuedCount,
  });
  const invoiceSequence = nextInvoiceSequence(existingInvoices);

  const sellerAddress = checkinSettings.fisa_property_address?.trim();
  const sellerCui = checkinSettings.fisa_owner_cui?.trim();
  if (!sellerAddress || !sellerCui) {
    return { ok: false, error: "invoice.seller_details_missing" };
  }

  const rooms = await getRoomsByIds(booking.room_ids);
  const roomsForInvoice = rooms.map((r) => ({
    room_id: r.id,
    room_name: r.name,
    building_name: r.building_name,
    price_per_night: Number(r.price_per_night),
  }));

  const pensionName =
    pension?.display_name?.trim() ||
    checkinSettings.pension_display_name ||
    (await getTenantDisplayName(tenantId));

  const supabase = createPublicAdminClient();
  const { data: numberPayload, error: numberError } = await supabase.rpc(
    "issue_next_invoice_number",
    { p_tenant_id: tenantId }
  );

  if (numberError) {
    if (numberError.message.includes("issue_next_invoice_number")) {
      return { ok: false, error: "invoice.migration_required" };
    }
    return { ok: false, error: numberError.message };
  }

  const numberData = numberPayload as {
    series: string;
    number: number;
    display: string;
  };

  const localeTag: "ro" | "en" | "bg" =
    locale === "bg" ? "bg" : locale === "en" ? "en" : "ro";
  const documentBase = {
    series: numberData.series,
    invoice_number: numberData.number,
    display_number: numberData.display,
    seller_name: pensionName,
    seller_cui: sellerCui,
    seller_reg_com: bookingRules.invoiceSellerRegCom,
    seller_address: sellerAddress,
    buyer_name: booking.guest_name,
    buyer_email: booking.guest_email,
    buyer_phone: booking.guest_phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    locale: localeTag,
    country: tenantCountry,
    vat_enabled: bookingRules.invoiceVatEnabled,
    vat_rate: bookingRules.invoiceVatRate,
    prices_include_vat: bookingRules.invoicePricesIncludeVat,
  };

  const document =
    issuedCount === 0 &&
    invoiceAmount + 0.005 >= totalDue &&
    options?.amount == null
      ? buildIssuedInvoiceDocument({
          ...documentBase,
          total_price: booking.total_price,
          rooms: roomsForInvoice,
          pricing_rules: pricingRules,
        })
      : buildAllocatedInvoiceDocument({
          ...documentBase,
          target_amount: invoiceAmount,
          invoice_kind: invoiceKind,
        });

  const { data: inserted, error: insertError } = await supabase
    .from("booking_invoices")
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      series: document.series,
      invoice_number: document.invoice_number,
      display_number: document.display_number,
      invoice_kind: invoiceKind,
      invoice_sequence: invoiceSequence,
      seller_name: document.seller_name,
      seller_cui: document.seller_cui,
      seller_reg_com: document.seller_reg_com,
      seller_address: document.seller_address,
      buyer_name: document.buyer_name,
      buyer_email: document.buyer_email,
      buyer_phone: document.buyer_phone,
      check_in: document.check_in,
      check_out: document.check_out,
      subtotal: document.subtotal,
      subtotal_net: document.subtotal_net,
      vat_rate: document.vat_rate,
      vat_amount: document.vat_amount,
      total: document.total,
      currency: document.currency,
      lines: document.lines,
      status: "issued",
    })
    .select("*")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  const invoiceId = String(inserted.id);
  const paymentIds = paymentsToLinkForInvoice(payments, invoiceAmount);
  if (paymentIds.length > 0) {
    const { error: linkError } = await supabase
      .from("booking_payments")
      .update({ invoice_id: invoiceId })
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId)
      .in("id", paymentIds);

    if (linkError && !linkError.message.includes("booking_payments")) {
      return { ok: false, error: linkError.message };
    }
  }

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidateTag(CACHE_TAGS.bookingPayments, "max");

  void enqueueFiscalSubmission(invoiceId, tenantId).catch((error) => {
    console.error("[issued-invoice] fiscal enqueue", error);
  });

  return {
    ok: true,
    invoice: {
      id: invoiceId,
      booking_id: bookingId,
      invoice_kind: invoiceKind,
      invoice_sequence: invoiceSequence,
      status: "issued",
      document: {
        ...document,
        legal_note: document.legal_note,
      },
    },
  };
}

export async function previewBookingInvoice(
  bookingId: string,
  options?: IssueBookingInvoiceOptions
): Promise<IssuedInvoiceDocument | null> {
  const [
    booking,
    pension,
    checkinSettings,
    bookingRules,
    pricingRules,
    locale,
    tenantId,
    tenantCountry,
    existingInvoices,
    payments,
  ] = await Promise.all([
    getBookingById(bookingId),
    getPensionSettings(),
    getCheckinSettings(),
    getBookingRulesSettings(),
    getStayPricingRules(),
    getLocale(),
    resolveTenantIdForData(),
    resolveTenantCountryForRequest(),
    listBookingInvoices(bookingId),
    listBookingPayments(bookingId),
  ]);

  if (!booking || booking.room_ids.length === 0) return null;

  const totalDue = Math.max(0, Number(booking.total_price ?? 0));
  const totalPaid = sumLedgerPayments(payments);
  const totalInvoiced = sumIssuedInvoiceTotals(existingInvoices);
  const financials = computeInvoiceFinancials(totalDue, totalPaid, totalInvoiced);

  if (financials.remainingToInvoice <= 0) {
    const latest = existingInvoices[existingInvoices.length - 1];
    return latest?.document ?? null;
  }

  const defaultAmount = resolveDefaultInvoiceAmount(financials);
  const requestedAmount = options?.amount ?? defaultAmount;
  const amountCheck = validateInvoiceAmount(
    requestedAmount,
    financials.remainingToInvoice
  );
  if (!amountCheck.ok) return null;

  const invoiceAmount = amountCheck.amount;
  const issuedCount = existingInvoices.length;
  const invoiceKind = resolveNextInvoiceKind({
    totalDue,
    totalInvoiced,
    invoiceAmount,
    issuedCount,
  });

  const rooms = await getRoomsByIds(booking.room_ids);
  const pensionName =
    pension?.display_name?.trim() ||
    checkinSettings.pension_display_name ||
    (await getTenantDisplayName(tenantId));

  const localeTag: "ro" | "en" | "bg" =
    locale === "bg" ? "bg" : locale === "en" ? "en" : "ro";
  const documentBase = {
    series: bookingRules.invoiceSeries,
    invoice_number: bookingRules.invoiceNextNumber,
    display_number: `${bookingRules.invoiceSeries}-${String(bookingRules.invoiceNextNumber).padStart(4, "0")}`,
    seller_name: pensionName,
    seller_cui: checkinSettings.fisa_owner_cui,
    seller_reg_com: bookingRules.invoiceSellerRegCom,
    seller_address: checkinSettings.fisa_property_address,
    buyer_name: booking.guest_name,
    buyer_email: booking.guest_email,
    buyer_phone: booking.guest_phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    locale: localeTag,
    country: tenantCountry,
    vat_enabled: bookingRules.invoiceVatEnabled,
    vat_rate: bookingRules.invoiceVatRate,
    prices_include_vat: bookingRules.invoicePricesIncludeVat,
  };

  if (
    issuedCount === 0 &&
    invoiceAmount + 0.005 >= totalDue &&
    options?.amount == null
  ) {
    return buildIssuedInvoiceDocument({
      ...documentBase,
      total_price: booking.total_price,
      rooms: rooms.map((r) => ({
        room_id: r.id,
        room_name: r.name,
        building_name: r.building_name,
        price_per_night: Number(r.price_per_night),
      })),
      pricing_rules: pricingRules,
    });
  }

  return buildAllocatedInvoiceDocument({
    ...documentBase,
    target_amount: invoiceAmount,
    invoice_kind: invoiceKind,
  });
}
