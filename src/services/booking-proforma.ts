import { cache } from "react";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { stayNightCount } from "@/lib/stay-dates";
import { buildProformaDocument } from "@/domain/invoice/issued-invoice";
import type { IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";
import {
  computeInvoiceFinancials,
  nextInvoiceSequence,
  paymentsToLinkForInvoice,
  resolveNextInvoiceKind,
  sumIssuedInvoiceTotals,
  validateInvoiceAmount,
} from "@/domain/invoice/invoice-allocation";
import { buildAllocatedInvoiceDocument } from "@/domain/invoice/issued-invoice";
import {
  canConvertProforma,
  nextProformaSequence,
  resolveDefaultProformaAmount,
  validateProformaAmount,
} from "@/domain/invoice/proforma";
import { sumLedgerPayments } from "@/domain/payments/ledger";
import { getBookingById } from "@/services/bookings";
import { listBookingPayments } from "@/services/booking-payments";
import { listBookingInvoices } from "@/services/issued-invoice";
import { getCheckinSettings } from "@/services/checkin";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getTenantDisplayName } from "@/services/tenants";
import { getLocale } from "next-intl/server";
import { resolveTenantCountryForRequest } from "@/lib/tenant/resolve-fiscal-tenant";

export type ProformaRecord = {
  id: string;
  booking_id: string;
  invoice_sequence: number;
  status: "issued" | "void";
  converted_to_invoice_id: string | null;
  document: IssuedInvoiceDocument;
};

function mapProformaRow(row: Record<string, unknown>): ProformaRecord {
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
    prices_include_vat: true,
    uses_recorded_total: true,
    legal_note: "",
  };
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    invoice_sequence:
      row.invoice_sequence != null ? Number(row.invoice_sequence) : 1,
    status: row.status === "void" ? "void" : "issued",
    converted_to_invoice_id:
      row.converted_to_invoice_id != null
        ? String(row.converted_to_invoice_id)
        : null,
    document,
  };
}

function isBookingInvoicesTableMissing(message: string): boolean {
  return message.includes("booking_invoices");
}

export const listBookingProformas = cache(async (
  bookingId: string
): Promise<ProformaRecord[]> => {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .eq("invoice_kind", "proforma")
    .eq("status", "issued")
    .order("invoice_sequence", { ascending: true });

  if (error) {
    if (isBookingInvoicesTableMissing(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapProformaRow(row as Record<string, unknown>)
  );
});

export type IssueBookingProformaOptions = {
  amount?: number;
};

export async function issueBookingProforma(
  bookingId: string,
  options?: IssueBookingProformaOptions
): Promise<{ ok: true; proforma: ProformaRecord } | { ok: false; error: string }> {
  const [
    booking,
    pension,
    checkinSettings,
    bookingRules,
    locale,
    tenantId,
    tenantCountry,
    fiscalInvoices,
    payments,
    existingProformas,
  ] = await Promise.all([
    getBookingById(bookingId),
    getPensionSettings(),
    getCheckinSettings(),
    getBookingRulesSettings(),
    getLocale(),
    resolveTenantIdForData(),
    resolveTenantCountryForRequest(),
    listBookingInvoices(bookingId),
    listBookingPayments(bookingId),
    listBookingProformas(bookingId),
  ]);

  if (!booking) return { ok: false, error: "booking.not_found" };
  if (booking.status !== "confirmata") {
    return { ok: false, error: "invoice.booking_not_confirmed" };
  }

  const totalDue = Math.max(0, Number(booking.total_price ?? 0));
  const totalInvoiced = sumIssuedInvoiceTotals(fiscalInvoices);
  const financials = computeInvoiceFinancials(
    totalDue,
    sumLedgerPayments(payments),
    totalInvoiced
  );

  if (financials.remainingToInvoice <= 0) {
    return { ok: false, error: "proforma.fully_invoiced" };
  }

  const defaultAmount = resolveDefaultProformaAmount(financials);
  const requestedAmount = options?.amount ?? defaultAmount;
  const amountCheck = validateProformaAmount(
    requestedAmount,
    financials.remainingToInvoice
  );
  if (!amountCheck.ok) return amountCheck;

  const sellerAddress = checkinSettings.fisa_property_address?.trim();
  const sellerCui = checkinSettings.fisa_owner_cui?.trim();
  if (!sellerAddress || !sellerCui) {
    return { ok: false, error: "invoice.seller_details_missing" };
  }

  const pensionName =
    pension?.display_name?.trim() ||
    checkinSettings.pension_display_name ||
    (await getTenantDisplayName(tenantId));

  const supabase = createPublicAdminClient();
  const { data: numberPayload, error: numberError } = await supabase.rpc(
    "issue_next_proforma_number",
    { p_tenant_id: tenantId }
  );

  if (numberError) {
    if (numberError.message.includes("issue_next_proforma_number")) {
      return { ok: false, error: "proforma.migration_required" };
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
  const document = buildProformaDocument({
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
    target_amount: amountCheck.amount,
    locale: localeTag,
    country: tenantCountry,
    vat_enabled: bookingRules.invoiceVatEnabled,
    vat_rate: bookingRules.invoiceVatRate,
    prices_include_vat: bookingRules.invoicePricesIncludeVat,
  });

  const proformaSequence = nextProformaSequence(existingProformas);

  const { data: inserted, error: insertError } = await supabase
    .from("booking_invoices")
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      series: document.series,
      invoice_number: document.invoice_number,
      display_number: document.display_number,
      invoice_kind: "proforma",
      invoice_sequence: proformaSequence,
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

  revalidateTag(CACHE_TAGS.pensionSettings, "max");

  return {
    ok: true,
    proforma: {
      ...mapProformaRow(inserted as Record<string, unknown>),
      document: {
        ...document,
        legal_note: document.legal_note,
      },
    },
  };
}

export async function previewBookingProforma(
  bookingId: string,
  options?: IssueBookingProformaOptions
): Promise<IssuedInvoiceDocument | null> {
  const [
    booking,
    pension,
    checkinSettings,
    bookingRules,
    locale,
    tenantId,
    tenantCountry,
    fiscalInvoices,
    payments,
  ] = await Promise.all([
    getBookingById(bookingId),
    getPensionSettings(),
    getCheckinSettings(),
    getBookingRulesSettings(),
    getLocale(),
    resolveTenantIdForData(),
    resolveTenantCountryForRequest(),
    listBookingInvoices(bookingId),
    listBookingPayments(bookingId),
  ]);

  if (!booking) return null;

  const totalDue = Math.max(0, Number(booking.total_price ?? 0));
  const totalInvoiced = sumIssuedInvoiceTotals(fiscalInvoices);
  const financials = computeInvoiceFinancials(
    totalDue,
    sumLedgerPayments(payments),
    totalInvoiced
  );

  if (financials.remainingToInvoice <= 0) return null;

  const defaultAmount = resolveDefaultProformaAmount(financials);
  const requestedAmount = options?.amount ?? defaultAmount;
  const amountCheck = validateProformaAmount(
    requestedAmount,
    financials.remainingToInvoice
  );
  if (!amountCheck.ok) return null;

  const pensionName =
    pension?.display_name?.trim() ||
    checkinSettings.pension_display_name ||
    (await getTenantDisplayName(tenantId));

  const localeTag: "ro" | "en" | "bg" =
    locale === "bg" ? "bg" : locale === "en" ? "en" : "ro";

  return buildProformaDocument({
    series: bookingRules.proformaSeries,
    invoice_number: bookingRules.proformaNextNumber,
    display_number: `${bookingRules.proformaSeries}-${String(bookingRules.proformaNextNumber).padStart(4, "0")}`,
    seller_name: pensionName,
    seller_cui: checkinSettings.fisa_owner_cui,
    seller_reg_com: bookingRules.invoiceSellerRegCom,
    seller_address: checkinSettings.fisa_property_address,
    buyer_name: booking.guest_name,
    buyer_email: booking.guest_email,
    buyer_phone: booking.guest_phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    target_amount: amountCheck.amount,
    locale: localeTag,
    country: tenantCountry,
    vat_enabled: bookingRules.invoiceVatEnabled,
    vat_rate: bookingRules.invoiceVatRate,
    prices_include_vat: bookingRules.invoicePricesIncludeVat,
  });
}

export async function convertProformaToInvoice(
  proformaId: string
): Promise<
  | { ok: true; invoiceId: string; displayNumber: string }
  | { ok: false; error: string }
> {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();

  const { data: proformaRow, error: loadError } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", proformaId)
    .eq("invoice_kind", "proforma")
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!proformaRow) return { ok: false, error: "proforma.not_found" };

  const proforma = mapProformaRow(proformaRow as Record<string, unknown>);
  const bookingId = proforma.booking_id;

  const [booking, bookingRules, locale, tenantCountry, fiscalInvoices, payments] =
    await Promise.all([
      getBookingById(bookingId),
      getBookingRulesSettings(),
      getLocale(),
      resolveTenantCountryForRequest(),
      listBookingInvoices(bookingId),
      listBookingPayments(bookingId),
    ]);

  if (!booking) return { ok: false, error: "booking.not_found" };

  const totalDue = Math.max(0, Number(booking.total_price ?? 0));
  const totalPaid = sumLedgerPayments(payments);
  const totalInvoiced = sumIssuedInvoiceTotals(fiscalInvoices);
  const financials = computeInvoiceFinancials(
    totalDue,
    totalPaid,
    totalInvoiced
  );

  const convertCheck = canConvertProforma({
    proformaTotal: proforma.document.total,
    totalPaid,
    remainingToInvoice: financials.remainingToInvoice,
    convertedToInvoiceId: proforma.converted_to_invoice_id,
    status: proforma.status,
  });
  if (!convertCheck.ok) return { ok: false, error: convertCheck.reason };

  const invoiceAmount = proforma.document.total;
  const amountCheck = validateInvoiceAmount(
    invoiceAmount,
    financials.remainingToInvoice
  );
  if (!amountCheck.ok) return amountCheck;

  const issuedCount = fiscalInvoices.length;
  const invoiceKind = resolveNextInvoiceKind({
    totalDue,
    totalInvoiced,
    invoiceAmount,
    issuedCount,
  });
  const invoiceSequence = nextInvoiceSequence(fiscalInvoices);

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
  const document = buildAllocatedInvoiceDocument({
    series: numberData.series,
    invoice_number: numberData.number,
    display_number: numberData.display,
    seller_name: proforma.document.seller_name,
    seller_cui: proforma.document.seller_cui,
    seller_reg_com: proforma.document.seller_reg_com,
    seller_address: proforma.document.seller_address,
    buyer_name: proforma.document.buyer_name,
    buyer_email: proforma.document.buyer_email,
    buyer_phone: proforma.document.buyer_phone,
    check_in: proforma.document.check_in,
    check_out: proforma.document.check_out,
    target_amount: invoiceAmount,
    invoice_kind: invoiceKind,
    locale: localeTag,
    country: tenantCountry,
    vat_enabled: bookingRules.invoiceVatEnabled,
    vat_rate: bookingRules.invoiceVatRate,
    prices_include_vat: bookingRules.invoicePricesIncludeVat,
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
      source_proforma_id: proformaId,
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
    .select("id, display_number")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  const invoiceId = String(inserted.id);

  const { error: linkProformaError } = await supabase
    .from("booking_invoices")
    .update({ converted_to_invoice_id: invoiceId })
    .eq("tenant_id", tenantId)
    .eq("id", proformaId);

  if (linkProformaError) {
    return { ok: false, error: linkProformaError.message };
  }

  const paymentIds = paymentsToLinkForInvoice(payments, invoiceAmount);
  if (paymentIds.length > 0) {
    const { error: linkPaymentError } = await supabase
      .from("booking_payments")
      .update({ invoice_id: invoiceId })
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId)
      .in("id", paymentIds);

    if (linkPaymentError && !linkPaymentError.message.includes("booking_payments")) {
      return { ok: false, error: linkPaymentError.message };
    }
  }

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidateTag(CACHE_TAGS.bookingPayments, "max");

  return {
    ok: true,
    invoiceId,
    displayNumber: String(inserted.display_number),
  };
}

export function proformaCanConvert(
  proforma: ProformaRecord,
  totalPaid: number,
  remainingToInvoice: number
): boolean {
  return (
    canConvertProforma({
      proformaTotal: proforma.document.total,
      totalPaid,
      remainingToInvoice,
      convertedToInvoiceId: proforma.converted_to_invoice_id,
      status: proforma.status,
    }).ok
  );
}
