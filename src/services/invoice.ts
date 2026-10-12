import { cache } from "react";
import { buildInformalInvoice, type InformalInvoice } from "@/domain/invoice/informal-invoice";
import { getBookingById } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { getStayPricingRules } from "@/services/booking-rules-settings";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantDisplayName } from "@/services/tenants";
import { getRoomsByIds } from "@/services/rooms-admin";

type InvoiceContext = {
  invoice: InformalInvoice;
  pensionName: string;
  pensionAddress: string | null;
};
