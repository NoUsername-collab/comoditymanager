import { notFound } from "next/navigation";
import { InformalInvoiceView } from "@/components/admin/invoice/InformalInvoiceView";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadInformalInvoice } from "@/services/invoice";
import { getTranslations } from "next-intl/server";

export default async function BookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isInvoicingAlphaEnabled()) notFound();

  const [tPage, tCommon, { id }, ctx] = await Promise.all([
    getTranslations("admin.pages.invoice"),
    getTranslations("admin.common"),
    params,
    params.then(({ id }) => loadInformalInvoice(id).catch(() => null)),
  ]);
  if (!ctx) notFound();

  return (
    <AdminPageFrame
      title={tCommon("informalDocument")}
      description={tPage("description")}
      backHref={`/admin/bookings/${id}`}
      backLabel={tPage("backToBooking")}
      className="admin-invoice-page print:p-0"
      bodyClassName="print:border-0 print:shadow-none"
    >
      <div className="print:border-0 print:bg-white">
        <InformalInvoiceView ctx={ctx} />
      </div>
    </AdminPageFrame>
  );
}
