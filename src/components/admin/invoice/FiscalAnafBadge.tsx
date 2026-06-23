"use client";

import { useTranslations } from "next-intl";
import type { FiscalSubmissionStatus } from "@/domain/fiscal/fiscal-provider";

type Props = {
  status: FiscalSubmissionStatus;
  className?: string;
};

const STATUS_CLASS: Record<FiscalSubmissionStatus, string> = {
  pending: "fiscal-anaf-badge--pending",
  submitted: "fiscal-anaf-badge--submitted",
  accepted: "fiscal-anaf-badge--accepted",
  rejected: "fiscal-anaf-badge--rejected",
  failed: "fiscal-anaf-badge--failed",
};

export function FiscalAnafBadge({ status, className = "" }: Props) {
  const t = useTranslations("admin.issuedInvoice.anaf");
  return (
    <span
      className={`fiscal-anaf-badge ${STATUS_CLASS[status]} ${className}`.trim()}
      title={t("badgeTitle")}
    >
      <span className="fiscal-anaf-badge__label">{t("badgeLabel")}</span>
      <span className="fiscal-anaf-badge__status">{t(`status.${status}`)}</span>
    </span>
  );
}
