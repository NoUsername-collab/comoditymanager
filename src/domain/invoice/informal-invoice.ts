import { stayNightCount } from "@/lib/stay-dates";

export type InvoiceLine = {
  room_id: string;
  room_name: string;
  building_name: string;
  price_per_night: number;
  nights: number;
  line_total: number;
};

export type InformalInvoice = {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  lines: InvoiceLine[];
  subtotal: number;
  total_price: number | null;
  uses_recorded_total: boolean;
  disclaimer: string;
};

const DISCLAIMER =
  "Informational document only. Not a fiscal invoice, receipt, or accounting document. " +
  "Values are estimates based on prices configured in the system.";

export function buildInformalInvoice(input: {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  total_price: number | null;
  rooms: {
    room_id: string;
    room_name: string;
    building_name: string;
    price_per_night: number;
  }[];
}): InformalInvoice {
  const nights = stayNightCount(input.check_in, input.check_out);
  const lines: InvoiceLine[] = input.rooms.map((r) => ({
    room_id: r.room_id,
    room_name: r.room_name,
    building_name: r.building_name,
    price_per_night: r.price_per_night,
    nights,
    line_total: Math.round(r.price_per_night * nights * 100) / 100,
  }));

  const subtotal = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  const uses_recorded_total =
    input.total_price != null && input.total_price > 0;

  return {
    booking_id: input.booking_id,
    guest_name: input.guest_name,
    guest_email: input.guest_email,
    guest_phone: input.guest_phone,
    check_in: input.check_in,
    check_out: input.check_out,
    nights,
    lines,
    subtotal,
    total_price: uses_recorded_total ? input.total_price : subtotal,
    uses_recorded_total,
    disclaimer: DISCLAIMER,
  };
}

export function formatRon(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
