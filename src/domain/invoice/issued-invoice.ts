import type { StayPricingRules } from "@/domain/settings/booking-rules";
import {
  computeRoomStayPricing,
  type RoomStayPricingLine,
} from "@/domain/pricing/nightly-rates";
import { stayNightCount } from "@/lib/stay-dates";

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
  total: number;
  uses_recorded_total: boolean;
  legal_note: string;
};

const LEGAL_NOTE_RO =
  "Document fiscal emis din Hospira. Nu înlocuiește integrarea e-Factura ANAF până la activarea modulului dedicat.";
const LEGAL_NOTE_EN =
  "Fiscal document issued from Hospira. Does not replace ANAF e-Factura integration until the dedicated module is enabled.";

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
  const subtotal =
    Math.round(lines.reduce((sum, line) => sum + line.line_total, 0) * 100) /
    100;
  const uses_recorded_total =
    input.total_price != null && input.total_price > 0;
  const total = uses_recorded_total ? input.total_price! : subtotal;
  const locale = input.locale ?? "ro";

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
    subtotal,
    total,
    uses_recorded_total,
    legal_note: locale === "en" ? LEGAL_NOTE_EN : LEGAL_NOTE_RO,
  };
}

export function formatInvoiceRon(amount: number, locale = "ro-RO"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
