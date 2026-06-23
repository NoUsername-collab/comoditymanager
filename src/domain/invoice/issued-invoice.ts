import type { StayPricingRules } from "@/domain/settings/booking-rules";
import {
  computeVatBreakdown,
  getCountryFiscalProfile,
  resolveInvoiceVatRate,
  type FiscalCurrency,
  type TenantCountry,
} from "@/domain/fiscal/country-fiscal-profile";
import {
  computeRoomStayPricing,
  type RoomStayPricingLine,
} from "@/domain/pricing/nightly-rates";
import { stayNightCount } from "@/lib/stay-dates";
import type { InvoiceKind } from "./invoice-allocation";

export type IssuedInvoiceLine = {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  room_id: string | null;
  meta?: {
    nights?: Array<{
      date: string;
      rate: number;
      weekend?: boolean;
      season?: string | null;
    }>;
  };
};

export type IssuedInvoiceDocument = {
  series: string;
  invoice_number: number;
  display_number: string;
  issued_at: string;
  seller_name: string;
  seller_cui: string | null;
  seller_reg_com: string | null;
  seller_address: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  lines: IssuedInvoiceLine[];
  subtotal: number;
  subtotal_net: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  currency: FiscalCurrency;
  prices_include_vat: boolean;
  uses_recorded_total: boolean;
  legal_note: string;
};

const LEGAL_NOTE_RO =
  "Document fiscal emis din Hospira. Nu înlocuiește integrarea e-Factura ANAF până la activarea modulului dedicat.";
const LEGAL_NOTE_EN =
  "Fiscal document issued from Hospira. Does not replace official fiscal integration until enabled.";
const LEGAL_NOTE_BG =
  "Fiscal document issued from Hospira. Does not replace official fiscal integration for Bulgaria.";

function buildLegalNote(locale: "ro" | "en" | "bg", country: TenantCountry): string {
  if (locale === "en") return LEGAL_NOTE_EN;
  if (locale === "bg") return LEGAL_NOTE_BG;
  if (country === "MD") {
    return "Document fiscal emis din Hospira. Nu înlocuiește integrarea cu SFS / casa de marcat.";
  }
  if (country === "BG") {
    return "Document fiscal emis din Hospira. Nu înlocuiește integrarea NRA / e-facturare.";
  }
  return LEGAL_NOTE_RO;
}

function buildLineFromRoomPricing(
  room: {
    room_id: string;
    room_name: string;
    building_name: string;
  },
  pricing: RoomStayPricingLine
): IssuedInvoiceLine {
  const description = `${room.room_name} (${room.building_name}) — cazare`;
  const nights = pricing.nights.length;
  const unit =
    nights > 0 ? Math.round((pricing.line_total / nights) * 100) / 100 : 0;

  return {
    description,
    quantity: nights,
    unit_price: unit,
    line_total: pricing.line_total,
    room_id: room.room_id,
    meta: {
      nights: pricing.nights.map((n) => ({
        date: n.date,
        rate: n.applied_rate,
        weekend: n.weekend_applied,
        season: n.season_name,
      })),
    },
  };
}

const INVOICE_KIND_LINE_RO: Record<InvoiceKind, string> = {
  advance: "Cazare — avans",
  partial: "Cazare — factură parțială",
  final: "Cazare",
  credit_note: "Cazare — notă de credit",
};

const INVOICE_KIND_LINE_EN: Record<InvoiceKind, string> = {
  advance: "Accommodation — advance",
  partial: "Accommodation — partial invoice",
  final: "Accommodation",
  credit_note: "Accommodation — credit note",
};

function invoiceKindLineDescription(
  kind: InvoiceKind,
  locale: "ro" | "en" | "bg"
): string {
  if (locale === "en" || locale === "bg") {
    return INVOICE_KIND_LINE_EN[kind];
  }
  return INVOICE_KIND_LINE_RO[kind];
}

const LEGAL_NOTE_PROFORMA_RO =
  "Document proformă — nu are valoare fiscală până la conversia în factură. Emis din Hospira.";
const LEGAL_NOTE_PROFORMA_EN =
  "Proforma document — not a fiscal invoice until converted. Issued from Hospira.";
const LEGAL_NOTE_PROFORMA_BG =
  "Proforma document — not a fiscal invoice until converted. Issued from Hospira.";

function buildProformaLegalNote(locale: "ro" | "en" | "bg"): string {
  if (locale === "en") return LEGAL_NOTE_PROFORMA_EN;
  if (locale === "bg") return LEGAL_NOTE_PROFORMA_BG;
  return LEGAL_NOTE_PROFORMA_RO;
}

const PROFORMA_LINE_RO = "Cazare — proformă";
const PROFORMA_LINE_EN = "Accommodation — proforma";

function proformaLineDescription(locale: "ro" | "en" | "bg"): string {
  if (locale === "en" || locale === "bg") return PROFORMA_LINE_EN;
  return PROFORMA_LINE_RO;
}

export function buildProformaDocument(input: {
  series: string;
  invoice_number: number;
  display_number: string;
  issued_at?: string;
  seller_name: string;
  seller_cui: string | null;
  seller_reg_com: string | null;
  seller_address: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  check_in: string;
  check_out: string;
  target_amount: number;
  locale?: "ro" | "en" | "bg";
  country?: TenantCountry;
  vat_enabled?: boolean;
  vat_rate?: number | null;
  prices_include_vat?: boolean;
}): IssuedInvoiceDocument {
  const locale = input.locale ?? "ro";
  const country = input.country ?? "RO";
  const profile = getCountryFiscalProfile(country);
  const vatEnabled = input.vat_enabled ?? true;
  const vatRate = resolveInvoiceVatRate(country, input.vat_rate);
  const pricesIncludeVat = input.prices_include_vat ?? true;
  const grossBase = Math.round(input.target_amount * 100) / 100;
  const breakdown = computeVatBreakdown(grossBase, vatRate, {
    enabled: vatEnabled,
    pricesIncludeVat,
  });

  return {
    series: input.series,
    invoice_number: input.invoice_number,
    display_number: input.display_number,
    issued_at: input.issued_at ?? new Date().toISOString(),
    seller_name: input.seller_name,
    seller_cui: input.seller_cui,
    seller_reg_com: input.seller_reg_com,
    seller_address: input.seller_address,
    buyer_name: input.buyer_name,
    buyer_email: input.buyer_email,
    buyer_phone: input.buyer_phone,
    check_in: input.check_in,
    check_out: input.check_out,
    nights: stayNightCount(input.check_in, input.check_out),
    lines: [
      {
        description: proformaLineDescription(locale),
        quantity: 1,
        unit_price: breakdown.gross,
        line_total: breakdown.gross,
        room_id: null,
      },
    ],
    subtotal: breakdown.gross,
    subtotal_net: breakdown.net,
    vat_rate: breakdown.rate,
    vat_amount: breakdown.vat,
    total: breakdown.gross,
    currency: profile.currency,
    prices_include_vat: pricesIncludeVat,
    uses_recorded_total: true,
    legal_note: buildProformaLegalNote(locale),
  };
}

export function buildAllocatedInvoiceDocument(input: {
  series: string;
  invoice_number: number;
  display_number: string;
  issued_at?: string;
  seller_name: string;
  seller_cui: string | null;
  seller_reg_com: string | null;
  seller_address: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  check_in: string;
  check_out: string;
  target_amount: number;
  invoice_kind: InvoiceKind;
  locale?: "ro" | "en" | "bg";
  country?: TenantCountry;
  vat_enabled?: boolean;
  vat_rate?: number | null;
  prices_include_vat?: boolean;
}): IssuedInvoiceDocument {
  const locale = input.locale ?? "ro";
  const country = input.country ?? "RO";
  const profile = getCountryFiscalProfile(country);
  const vatEnabled = input.vat_enabled ?? true;
  const vatRate = resolveInvoiceVatRate(country, input.vat_rate);
  const pricesIncludeVat = input.prices_include_vat ?? true;
  const grossBase = Math.round(input.target_amount * 100) / 100;
  const breakdown = computeVatBreakdown(grossBase, vatRate, {
    enabled: vatEnabled,
    pricesIncludeVat,
  });

  return {
    series: input.series,
    invoice_number: input.invoice_number,
    display_number: input.display_number,
    issued_at: input.issued_at ?? new Date().toISOString(),
    seller_name: input.seller_name,
    seller_cui: input.seller_cui,
    seller_reg_com: input.seller_reg_com,
    seller_address: input.seller_address,
    buyer_name: input.buyer_name,
    buyer_email: input.buyer_email,
    buyer_phone: input.buyer_phone,
    check_in: input.check_in,
    check_out: input.check_out,
    nights: stayNightCount(input.check_in, input.check_out),
    lines: [
      {
        description: invoiceKindLineDescription(input.invoice_kind, locale),
        quantity: 1,
        unit_price: breakdown.gross,
        line_total: breakdown.gross,
        room_id: null,
      },
    ],
    subtotal: breakdown.gross,
    subtotal_net: breakdown.net,
    vat_rate: breakdown.rate,
    vat_amount: breakdown.vat,
    total: breakdown.gross,
    currency: profile.currency,
    prices_include_vat: pricesIncludeVat,
    uses_recorded_total: true,
    legal_note: buildLegalNote(locale, country),
  };
}

export function buildIssuedInvoiceDocument(input: {
  series: string;
  invoice_number: number;
  display_number: string;
  issued_at?: string;
  seller_name: string;
  seller_cui: string | null;
  seller_reg_com: string | null;
  seller_address: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  check_in: string;
  check_out: string;
  total_price: number | null;
  rooms: Array<{
    room_id: string;
    room_name: string;
    building_name: string;
    price_per_night: number;
  }>;
  pricing_rules?: StayPricingRules | null;
  locale?: "ro" | "en" | "bg";
  country?: TenantCountry;
  vat_enabled?: boolean;
  vat_rate?: number | null;
  prices_include_vat?: boolean;
}): IssuedInvoiceDocument {
  const lines = input.rooms.map((room) =>
    buildLineFromRoomPricing(
      room,
      computeRoomStayPricing(
        room,
        input.check_in,
        input.check_out,
        input.pricing_rules
      )
    )
  );
  const linesTotal =
    Math.round(lines.reduce((sum, line) => sum + line.line_total, 0) * 100) /
    100;
  const uses_recorded_total =
    input.total_price != null && input.total_price > 0;
  const grossBase = uses_recorded_total ? input.total_price! : linesTotal;
  const locale = input.locale ?? "ro";
  const country = input.country ?? "RO";
  const profile = getCountryFiscalProfile(country);
  const vatEnabled = input.vat_enabled ?? true;
  const vatRate = resolveInvoiceVatRate(country, input.vat_rate);
  const pricesIncludeVat = input.prices_include_vat ?? true;
  const breakdown = computeVatBreakdown(grossBase, vatRate, {
    enabled: vatEnabled,
    pricesIncludeVat,
  });

  return {
    series: input.series,
    invoice_number: input.invoice_number,
    display_number: input.display_number,
    issued_at: input.issued_at ?? new Date().toISOString(),
    seller_name: input.seller_name,
    seller_cui: input.seller_cui,
    seller_reg_com: input.seller_reg_com,
    seller_address: input.seller_address,
    buyer_name: input.buyer_name,
    buyer_email: input.buyer_email,
    buyer_phone: input.buyer_phone,
    check_in: input.check_in,
    check_out: input.check_out,
    nights: stayNightCount(input.check_in, input.check_out),
    lines,
    subtotal: breakdown.gross,
    subtotal_net: breakdown.net,
    vat_rate: breakdown.rate,
    vat_amount: breakdown.vat,
    total: breakdown.gross,
    currency: profile.currency,
    prices_include_vat: pricesIncludeVat,
    uses_recorded_total,
    legal_note: buildLegalNote(locale, country),
  };
}

export function formatInvoiceMoney(
  amount: number,
  currency: FiscalCurrency,
  locale = "ro-RO"
): string {
  const tag =
    currency === "BGN"
      ? locale.startsWith("bg")
        ? "bg-BG"
        : "en-GB"
      : currency === "MDL"
        ? "ro-MD"
        : locale.startsWith("en")
          ? "en-GB"
          : "ro-RO";

  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** @deprecated Use formatInvoiceMoney */
export function formatInvoiceRon(amount: number, locale = "ro-RO"): string {
  return formatInvoiceMoney(amount, "RON", locale);
}
