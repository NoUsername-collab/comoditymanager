import { notFound } from "next/navigation";
import {
  BookingInvoicePanel,
  type BookingInvoiceListItem,
  type BookingProformaListItem,
} from "@/features/bookings/ui/BookingInvoicePanel";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import {
  resolveDefaultInvoiceAmount,
} from "@/domain/invoice/invoice-allocation";
import { resolveDefaultProformaAmount } from "@/domain/invoice/proforma";
import { loadBookingInvoicePage } from "@/features/bookings/loaders";
import { proformaCanConvert } from "@/services/booking-proforma";
import { getTranslations } from "next-intl/server";
import "@/styles/features/shared/invoice-print.css";

export default async function BookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, tPage, tCommon, data] = await Promise.all([
    params,
    getTranslations("admin.pages.invoice"),
    getTranslations("admin.common"),
    params.then(({ id }) => loadBookingInvoicePage(id)),
  ]);

  if (!data) notFound();

  const {
    invoices,
    proformas,
    financial,
    preview,
    proformaPreview,
    fiscalSettings,
    fiscalStatusByInvoiceId,
    showPlatformBranding,
  } = data;

  const invoiceList: BookingInvoiceListItem[] = invoices.map((inv) => ({
    id: inv.id,
    display_number: inv.document.display_number,
    total: inv.document.total,
    issued_at: inv.document.issued_at,
    invoice_kind: inv.invoice_kind,
    invoice_sequence: inv.invoice_sequence,
    document: inv.document,
  }));

  const proformaList: BookingProformaListItem[] = proformas.map((pf) => ({
    id: pf.id,
    display_number: pf.document.display_number,
    total: pf.document.total,
    issued_at: pf.document.issued_at,
    invoice_sequence: pf.invoice_sequence,
    converted_to_invoice_id: pf.converted_to_invoice_id,
    document: pf.document,
    canConvert: proformaCanConvert(
      pf,
      financial.totalPaid,
      financial.remainingToInvoice
    ),
  }));

  const canIssueNext = financial.remainingToInvoice > 0;
  const canIssueProforma = financial.remainingToInvoice > 0;
  const nextInvoiceAmount = resolveDefaultInvoiceAmount({
    remainingToInvoice: financial.remainingToInvoice,
    uninvoicedPaid: financial.uninvoicedPaid,
  });
  const nextProformaAmount = resolveDefaultProformaAmount({
    remainingToInvoice: financial.remainingToInvoice,
    uninvoicedPaid: financial.uninvoicedPaid,
  });

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
          document={preview}
          proformaPreview={proformaPreview}
          invoices={invoiceList}
          proformas={proformaList}
          canIssueNext={canIssueNext}
          canIssueProforma={canIssueProforma}
          nextInvoiceAmount={nextInvoiceAmount}
          nextProformaAmount={nextProformaAmount}
          uninvoicedPaid={financial.uninvoicedPaid}
          remainingToInvoice={financial.remainingToInvoice}
          showPlatformBranding={showPlatformBranding}
          fiscalProvider={fiscalSettings.provider}
          fiscalStatusByInvoiceId={fiscalStatusByInvoiceId}
        />
      </div>
    </AdminPageFrame>
  );
}
