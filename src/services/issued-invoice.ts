import { cache } from "react";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { stayNightCount } from "@/lib/stay-dates";
import { buildIssuedInvoiceDocument, type IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";
import { getBookingById } from "@/services/bookings";
import { getCheckinSettings } from "@/services/checkin";
import {
  getBookingRulesSettings,
  getStayPricingRules,
} from "@/services/booking-rules-settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getRoomsByIds } from "@/services/rooms-admin";
import { getTenantDisplayName } from "@/services/tenants";
import { getLocale } from "next-intl/server";

export type IssuedInvoiceRecord = {
  id: string;
  booking_id: string;
  document: IssuedInvoiceDocument;
};

function mapInvoiceRow(row: Record<string, unknown>): IssuedInvoiceRecord {
  const lines = Array.isArray(row.lines) ? row.lines : [];
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
    total: Number(row.total),
    uses_recorded_total: false,
    legal_note: "",
  };
  return {
    id: String(row.id),
    booking_id: String(row.booking_id),
    document,
  };
}

export const loadActiveBookingInvoice = cache(async (
  bookingId: string
): Promise<IssuedInvoiceRecord | null> => {
  const tenantId = await resolveTenantIdForData();
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("booking_invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .eq("status", "issued")
    .maybeSingle();

  if (error) {
    if (error.message.includes("booking_invoices")) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapInvoiceRow(data as Record<string, unknown>);
});

export async function issueBookingInvoice(
  bookingId: string
): Promise<{ ok: true; invoice: IssuedInvoiceRecord } | { ok: false; error: string }> {
  const existing = await loadActiveBookingInvoice(bookingId);
  if (existing) {
    return { ok: true, invoice: existing };
  }

  const [
    booking,
    pension,
    checkinSettings,
    bookingRules,
    pricingRules,
    locale,
    tenantId,
  ] = await Promise.all([
    getBookingById(bookingId),
    getPensionSettings(),
    getCheckinSettings(),
    getBookingRulesSettings(),
    getStayPricingRules(),
    getLocale(),
    resolveTenantIdForData(),
  ]);

  if (!booking) return { ok: false, error: "booking.not_found" };
  if (booking.status !== "confirmata") {
    return { ok: false, error: "invoice.booking_not_confirmed" };
  }
  if (booking.room_ids.length === 0) {
    return { ok: false, error: "invoice.no_rooms" };
  }

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

  const document = buildIssuedInvoiceDocument({
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
    total_price: booking.total_price,
    rooms: roomsForInvoice,
    pricing_rules: pricingRules,
    locale: locale === "bg" ? "bg" : locale === "en" ? "en" : "ro",
  });

  const { data: inserted, error: insertError } = await supabase
    .from("booking_invoices")
    .insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      series: document.series,
      invoice_number: document.invoice_number,
      display_number: document.display_number,
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
      total: document.total,
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
    invoice: {
      id: String(inserted.id),
      booking_id: bookingId,
      document: {
        ...document,
        legal_note: document.legal_note,
      },
    },
  };
}

export async function previewBookingInvoice(
  bookingId: string
): Promise<IssuedInvoiceDocument | null> {
  const active = await loadActiveBookingInvoice(bookingId);
  if (active) return active.document;

  const [booking, pension, checkinSettings, bookingRules, pricingRules, locale, tenantId] =
    await Promise.all([
      getBookingById(bookingId),
      getPensionSettings(),
      getCheckinSettings(),
      getBookingRulesSettings(),
      getStayPricingRules(),
      getLocale(),
      resolveTenantIdForData(),
    ]);

  if (!booking || booking.room_ids.length === 0) return null;

  const rooms = await getRoomsByIds(booking.room_ids);
  const pensionName =
    pension?.display_name?.trim() ||
    checkinSettings.pension_display_name ||
    (await getTenantDisplayName(tenantId));

  return buildIssuedInvoiceDocument({
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
    total_price: booking.total_price,
    rooms: rooms.map((r) => ({
      room_id: r.id,
      room_name: r.name,
      building_name: r.building_name,
      price_per_night: Number(r.price_per_night),
    })),
    pricing_rules: pricingRules,
    locale: locale === "bg" ? "bg" : locale === "en" ? "en" : "ro",
  });
}
