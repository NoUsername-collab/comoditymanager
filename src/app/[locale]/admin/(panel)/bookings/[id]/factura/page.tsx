import { notFound } from "next/navigation";
import { InformalInvoiceView } from "@/components/admin/invoice/InformalInvoiceView";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadInformalInvoice } from "@/services/invoice";
import { getTranslations } from "next-intl/server";

export default async function BookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tPage = await getTranslations("admin.pages.invoice");
  const tCommon = await getTranslations("admin.common");
  if (!isInvoicingAlphaEnabled()) notFound();

  const { id } = await params;
  const ctx = await loadInformalInvoice(id).catch(() => null);
  if (!ctx) notFound();

  return (
    <AdminRetroPageFrame
      title={tCommon("informalDocument")}
      description={tPage("description")}
      backHref={`/admin/bookings/${id}`}
      backLabel={tPage("backToBooking")}
      className="print:p-0"
      bodyClassName="print:border-0 print:shadow-none"
    >
      <div className="print:border-0 print:bg-white">
        <InformalInvoiceView ctx={ctx} />
      </div>
    </AdminRetroPageFrame>
  );
}
