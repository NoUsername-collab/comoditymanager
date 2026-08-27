"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { ensureTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { issueBookingInvoice } from "@/services/issued-invoice";
import { getTranslations } from "next-intl/server";

export async function issueBookingInvoiceAction(
  bookingId: string,
  amount?: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureTenantContextFromRequest();
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const result = await issueBookingInvoice(
    bookingId,
    amount != null ? { amount } : undefined
  );
  if (!result.ok) {
    const key = result.error;
    const mapped =
      key === "invoice.seller_details_missing"
        ? t("invoiceSellerDetailsMissing")
        : key === "invoice.booking_not_confirmed"
          ? t("invoiceBookingNotConfirmed")
          : key === "invoice.migration_required"
            ? t("invoiceMigrationRequired")
            : key === "invoice.fully_invoiced"
              ? t("invoiceFullyInvoiced")
              : key === "invoice.amount_exceeds_remaining"
                ? t("invoiceAmountExceedsRemaining")
                : key === "invoice.invalid_amount"
                  ? t("invoiceInvalidAmount")
                  : key;
    return { ok: false, error: mapped };
  }

  await logAdminActivityFromSession({
    action: "invoice.issued",
    entityType: "booking",
    entityId: bookingId,
    summary: `Factură ${result.invoice.document.display_number}`,
    metadata: {
      invoice_id: result.invoice.id,
      display_number: result.invoice.document.display_number,
      invoice_kind: result.invoice.invoice_kind,
      invoice_sequence: result.invoice.invoice_sequence,
    },
  });

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidatePath(`/admin/bookings/${bookingId}`);

  return { ok: true };
}

export async function issueBookingProformaAction(
  bookingId: string,
  amount?: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureTenantContextFromRequest();
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const { issueBookingProforma } = await import("@/services/booking-proforma");
  const result = await issueBookingProforma(
    bookingId,
    amount != null ? { amount } : undefined
  );
  if (!result.ok) {
    const key = result.error;
    const mapped =
      key === "invoice.seller_details_missing"
        ? t("invoiceSellerDetailsMissing")
        : key === "invoice.booking_not_confirmed"
          ? t("invoiceBookingNotConfirmed")
          : key === "proforma.migration_required"
            ? t("proformaMigrationRequired")
            : key === "proforma.fully_invoiced"
              ? t("proformaFullyInvoiced")
              : key === "proforma.amount_exceeds_remaining"
                ? t("proformaAmountExceedsRemaining")
                : key === "proforma.invalid_amount"
                  ? t("proformaInvalidAmount")
                  : key;
    return { ok: false, error: mapped };
  }

  await logAdminActivityFromSession({
    action: "proforma.issued",
    entityType: "booking",
    entityId: bookingId,
    summary: `Proformă ${result.proforma.document.display_number}`,
    metadata: {
      proforma_id: result.proforma.id,
      display_number: result.proforma.document.display_number,
    },
  });

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidatePath(`/admin/bookings/${bookingId}`);

  return { ok: true };
}

export async function convertProformaToInvoiceAction(
  proformaId: string,
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureTenantContextFromRequest();
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const { convertProformaToInvoice } = await import("@/services/booking-proforma");
  const result = await convertProformaToInvoice(proformaId);
  if (!result.ok) {
    const key = result.error;
    const mapped =
      key === "proforma.not_found"
        ? t("proformaNotFound")
        : key === "proforma.already_converted"
          ? t("proformaAlreadyConverted")
          : key === "proforma.payment_insufficient"
            ? t("proformaPaymentInsufficient")
            : key === "proforma.exceeds_remaining"
              ? t("proformaExceedsRemaining")
              : key === "invoice.migration_required"
                ? t("invoiceMigrationRequired")
                : key;
    return { ok: false, error: mapped };
  }

  await logAdminActivityFromSession({
    action: "proforma.converted",
    entityType: "booking",
    entityId: bookingId,
    summary: `Proformă convertită în ${result.displayNumber}`,
    metadata: {
      proforma_id: proformaId,
      invoice_id: result.invoiceId,
      display_number: result.displayNumber,
    },
  });

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidateTag(CACHE_TAGS.bookingPayments, "max");
  revalidatePath(`/admin/bookings/${bookingId}`);

  return { ok: true };
}
