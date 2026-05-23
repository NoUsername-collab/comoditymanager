import { notFound } from "next/navigation";
import { InformalInvoiceView } from "@/components/admin/invoice/InformalInvoiceView";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { isInvoicingAlphaEnabled } from "@/lib/features";
import { loadInformalInvoice } from "@/services/invoice";

export default async function BookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isInvoicingAlphaEnabled()) notFound();

  const { id } = await params;
  const ctx = await loadInformalInvoice(id).catch(() => null);
  if (!ctx) notFound();

  return (
    <AdminRetroPageFrame
      title="Document informativ"
      description="Prezentare pentru client — nu înlocuiește factura fiscală."
      backHref={`/admin/bookings/${id}`}
      backLabel="Înapoi la rezervare"
      className="print:p-0"
      bodyClassName="print:border-0 print:shadow-none"
    >
      <div className="print:border-0 print:bg-white">
        <InformalInvoiceView ctx={ctx} />
      </div>
    </AdminRetroPageFrame>
  );
}
