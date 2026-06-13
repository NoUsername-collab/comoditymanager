"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { issueBookingInvoice } from "@/services/issued-invoice";
import { getTranslations } from "next-intl/server";

export async function issueBookingInvoiceAction(
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await getTranslations("admin.serverActions");
  await requireLocationAdmin();

  const result = await issueBookingInvoice(bookingId);
  if (!result.ok) {
    const key = result.error;
    const mapped =
      key === "invoice.seller_details_missing"
        ? t("invoiceSellerDetailsMissing")
        : key === "invoice.booking_not_confirmed"
          ? t("invoiceBookingNotConfirmed")
          : key === "invoice.migration_required"
            ? t("invoiceMigrationRequired")
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
    },
  });

  revalidateTag(CACHE_TAGS.pensionSettings, "max");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath(`/admin/bookings/${bookingId}/factura`);

  return { ok: true };
}
