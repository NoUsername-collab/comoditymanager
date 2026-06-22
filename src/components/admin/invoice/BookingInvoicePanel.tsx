"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { issueBookingInvoiceAction } from "@/app/[locale]/admin/(panel)/bookings/invoice-actions";
import { IssuedInvoiceView } from "@/components/admin/invoice/IssuedInvoiceView";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import type { IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";

type Props = {
  bookingId: string;
  document: IssuedInvoiceDocument;
  issued: boolean;
  showPlatformBranding: boolean;
};

export function BookingInvoicePanel({
  bookingId,
  document: initialDocument,
  issued: initialIssued,
  showPlatformBranding,
}: Props) {
  const t = useTranslations("admin.issuedInvoice");
  const { showToast } = useAdminFx();
  const router = useRouter();
  const [issuing, setIssuing] = useState(false);
  const [document, setDocument] = useState(initialDocument);
  const [issued, setIssued] = useState(initialIssued);

  useEffect(() => {
    setDocument(initialDocument);
    setIssued(initialIssued);
  }, [initialDocument, initialIssued]);

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
    setIssued(true);
    router.refresh();
  }

  return (
    <IssuedInvoiceView
      document={document}
      showPlatformBranding={showPlatformBranding}
      issued={issued}
      onIssue={issued ? undefined : handleIssue}
      issuing={issuing}
    />
  );
}
