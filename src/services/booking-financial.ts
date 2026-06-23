import { cache } from "react";
import { computePaymentTotals } from "@/domain/payments/ledger";
import type { FinancialSnapshot } from "@/domain/payments/types";
import { getBookingById } from "@/services/bookings";
import { listBookingPayments } from "@/services/booking-payments";
import {
  computeInvoiceFinancials,
  sumIssuedInvoiceTotals,
} from "@/domain/invoice/invoice-allocation";
import { listBookingInvoices } from "@/services/issued-invoice";

export const loadFinancialSnapshot = cache(async (
  bookingId: string
): Promise<FinancialSnapshot | null> => {
  const [booking, payments, invoices] = await Promise.all([
    getBookingById(bookingId),
    listBookingPayments(bookingId),
    listBookingInvoices(bookingId).catch(() => []),
  ]);

  if (!booking) return null;

  const totalDue = Math.max(0, Number(booking.total_price ?? 0));
  const totals = computePaymentTotals(totalDue, payments);
  const totalInvoiced = sumIssuedInvoiceTotals(invoices);
  const invoiceFinancials = computeInvoiceFinancials(
    totalDue,
    totals.totalPaid,
    totalInvoiced
  );

  return {
    ...totals,
    totalInvoiced: invoiceFinancials.totalInvoiced,
    uninvoicedPaid: invoiceFinancials.uninvoicedPaid,
    remainingToInvoice: invoiceFinancials.remainingToInvoice,
    payments,
  };
});