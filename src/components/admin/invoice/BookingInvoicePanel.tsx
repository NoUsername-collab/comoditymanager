"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { issueBookingInvoiceAction } from "@/app/[locale]/admin/(panel)/bookings/invoice-actions";
import { IssuedInvoiceView } from "@/components/admin/invoice/IssuedInvoiceView";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";

type Props = {
  bookingId: string;
  document: IssuedInvoiceDocument;
  issued: boolean;
  showHospiraBranding: boolean;
};

export function BookingInvoicePanel({
  bookingId,
  document,
  issued,
  showHospiraBranding,
}: Props) {
  const t = useTranslations("admin.issuedInvoice");
  const { showToast } = useAdminFx();
  const router = useRouter();
  const [issuing, setIssuing] = useState(false);

  async function handleIssue() {
    setIssuing(true);
    const result = await issueBookingInvoiceAction(bookingId);
    setIssuing(false);
    if (!result.ok) {
      showToast({
        kind: "error",
        title: t("issueError"),
        message: result.error ?? "",
      });
      return;
    }
    showToast({ kind: "success", title: t("issueSuccess") });
    router.refresh();
  }

  return (
    <IssuedInvoiceView
      document={document}
      showHospiraBranding={showHospiraBranding}
      issued={issued}
      onIssue={issued ? undefined : handleIssue}
      issuing={issuing}
    />
  );
}
