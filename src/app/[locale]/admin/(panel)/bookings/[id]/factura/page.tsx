import { notFound } from "next/navigation";
import { BookingInvoicePanel } from "@/components/admin/invoice/BookingInvoicePanel";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { ensureTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { resolveShowBrandingForRequest } from "@/lib/tenant/resolve-fiscal-tenant";
import {
  loadActiveBookingInvoice,
  previewBookingInvoice,
} from "@/services/issued-invoice";
import { getBookingById } from "@/services/bookings/queries";
import { getTranslations } from "next-intl/server";

export default async function BookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, , tPage, tCommon, booking] = await Promise.all([
    params,
    ensureTenantContextFromRequest(),
    getTranslations("admin.pages.invoice"),
    getTranslations("admin.common"),
    params.then(({ id }) => getBookingById(id)),
  ]);

  if (!booking || booking.status !== "confirmata") notFound();

  const [active, preview] = await Promise.all([
    loadActiveBookingInvoice(id),
    previewBookingInvoice(id),
  ]);

  if (!preview) notFound();

  const document = active?.document ?? preview;
  const showPlatformBranding = await resolveShowBrandingForRequest();

  return (
    <AdminPageFrame
      title={tCommon("invoiceDocument")}
      description={tPage("description")}
      backHref={`/admin/bookings/${id}`}
      backLabel={tPage("backToBooking")}
      className="admin-invoice-page print:p-0"
      bodyClassName="print:border-0 print:shadow-none"
    >
      <div className="print:border-0 print:bg-white">
        <BookingInvoicePanel
          bookingId={id}
          document={document}
          issued={Boolean(active)}
          showPlatformBranding={showPlatformBranding}
        />
      </div>
    </AdminPageFrame>
  );
}
