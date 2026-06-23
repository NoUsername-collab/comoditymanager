"use client";

import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  convertProformaToInvoiceAction,
  issueBookingInvoiceAction,
  issueBookingProformaAction,
} from "@/app/[locale]/admin/(panel)/bookings/invoice-actions";
import { IssuedInvoiceView } from "@/components/admin/invoice/IssuedInvoiceView";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  formatInvoiceMoney,
  type IssuedInvoiceDocument,
} from "@/domain/invoice/issued-invoice";
import type { FiscalSubmissionStatus } from "@/domain/fiscal/fiscal-provider";
import {
  invoiceKindLabelKey,
  type InvoiceKind,
} from "@/domain/invoice/invoice-allocation";

export type BookingInvoiceListItem = {
  id: string;
  display_number: string;
  total: number;
  issued_at: string;
  invoice_kind: InvoiceKind;
  invoice_sequence: number;
  document: IssuedInvoiceDocument;
};

export type BookingProformaListItem = {
  id: string;
  display_number: string;
  total: number;
  issued_at: string;
  invoice_sequence: number;
  converted_to_invoice_id: string | null;
  document: IssuedInvoiceDocument;
  canConvert: boolean;
};

type ViewMode = "fiscal-next" | `fiscal-${string}` | "proforma-next" | `proforma-${string}`;

type Props = {
  bookingId: string;
  document: IssuedInvoiceDocument;
  proformaPreview: IssuedInvoiceDocument | null;
  invoices: BookingInvoiceListItem[];
  proformas: BookingProformaListItem[];
  canIssueNext: boolean;
  canIssueProforma: boolean;
  nextInvoiceAmount: number;
  nextProformaAmount: number;
  uninvoicedPaid: number;
  remainingToInvoice: number;
  showPlatformBranding: boolean;
  fiscalProvider?: "internal_pdf" | "anaf";
  fiscalStatusByInvoiceId?: Record<string, FiscalSubmissionStatus>;
};

export function BookingInvoicePanel({
  bookingId,
  document: initialDocument,
  proformaPreview,
  invoices: initialInvoices,
  proformas: initialProformas,
  canIssueNext,
  canIssueProforma,
  nextInvoiceAmount,
  nextProformaAmount,
  uninvoicedPaid,
  remainingToInvoice,
  showPlatformBranding,
  fiscalProvider = "internal_pdf",
  fiscalStatusByInvoiceId = {},
}: Props) {
  const t = useTranslations("admin.issuedInvoice");
  const locale = useLocale();
  const { showToast } = useAdminFx();
  const router = useRouter();
  const [issuing, setIssuing] = useState(false);
  const [issuingProforma, setIssuingProforma] = useState(false);
  const [converting, setConverting] = useState(false);
  const [document, setDocument] = useState(initialDocument);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [proformas, setProformas] = useState(initialProformas);
  const [view, setView] = useState<ViewMode>(() => {
    if (initialInvoices.length > 0) {
      return `fiscal-${initialInvoices[initialInvoices.length - 1]!.id}`;
    }
    if (canIssueNext) return "fiscal-next";
    if (initialProformas.length > 0) {
      return `proforma-${initialProformas[initialProformas.length - 1]!.id}`;
    }
    return canIssueProforma ? "proforma-next" : "fiscal-next";
  });

  useEffect(() => {
    setDocument(initialDocument);
    setInvoices(initialInvoices);
    setProformas(initialProformas);
    if (initialInvoices.length > 0) {
      setView(`fiscal-${initialInvoices[initialInvoices.length - 1]!.id}`);
    } else if (canIssueNext) {
      setView("fiscal-next");
    } else if (initialProformas.length > 0) {
      setView(`proforma-${initialProformas[initialProformas.length - 1]!.id}`);
    } else if (canIssueProforma) {
      setView("proforma-next");
    }
  }, [
    initialDocument,
    initialInvoices,
    initialProformas,
    canIssueNext,
    canIssueProforma,
  ]);

  const dateTag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  const formatMoney = (amount: number, currency = document.currency) =>
    formatInvoiceMoney(amount, currency, dateTag);

  const isProformaView = view.startsWith("proforma");
  const selectedInvoice =
    view.startsWith("fiscal-") && view !== "fiscal-next"
      ? invoices.find((inv) => view === `fiscal-${inv.id}`) ?? null
      : null;
  const selectedProforma =
    view.startsWith("proforma-") && view !== "proforma-next"
      ? proformas.find((pf) => view === `proforma-${pf.id}`) ?? null
      : null;

  const viewDocument =
    selectedInvoice?.document ??
    selectedProforma?.document ??
    (isProformaView ? proformaPreview ?? document : document);

  const viewingIssued = Boolean(selectedInvoice || selectedProforma);
  const viewingConvertedProforma =
    selectedProforma?.converted_to_invoice_id != null;

  const selectedAnafStatus =
    selectedInvoice && fiscalProvider === "anaf"
      ? fiscalStatusByInvoiceId[selectedInvoice.id] ?? null
      : null;

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

  async function handleIssueProforma() {
    setIssuingProforma(true);
    const result = await issueBookingProformaAction(bookingId);
    setIssuingProforma(false);
    if (!result.ok) {
      showToast({
        kind: "error",
        title: t("proformaIssueError"),
        message: result.error ?? "",
      });
      return;
    }
    showToast({ kind: "success", title: t("proformaIssueSuccess") });
    router.refresh();
  }

  async function handleConvert() {
    if (!selectedProforma) return;
    setConverting(true);
    const result = await convertProformaToInvoiceAction(
      selectedProforma.id,
      bookingId
    );
    setConverting(false);
    if (!result.ok) {
      showToast({
        kind: "error",
        title: t("convertError"),
        message: result.error ?? "",
      });
      return;
    }
    showToast({ kind: "success", title: t("convertSuccess") });
    router.refresh();
  }

  return (
    <div className="booking-invoice-panel">
      {invoices.length > 0 ? (
        <section
          className="booking-invoice-panel__list admin-surface-card"
          aria-label={t("invoiceList")}
        >
          <h3 className="booking-invoice-panel__list-title">{t("invoiceList")}</h3>
          <ul className="booking-invoice-panel__list-items">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <button
                  type="button"
                  className={`booking-invoice-panel__list-btn${
                    view === `fiscal-${inv.id}`
                      ? " booking-invoice-panel__list-btn--active"
                      : ""
                  }`}
                  onClick={() => setView(`fiscal-${inv.id}`)}
                >
                  <span className="booking-invoice-panel__list-number">
                    {inv.display_number}
                  </span>
                  <span className="booking-invoice-panel__list-meta">
                    {t(invoiceKindLabelKey(inv.invoice_kind))} ·{" "}
                    {formatMoney(inv.total)}
                  </span>
                </button>
              </li>
            ))}
            {canIssueNext ? (
              <li>
                <button
                  type="button"
                  className={`booking-invoice-panel__list-btn${
                    view === "fiscal-next"
                      ? " booking-invoice-panel__list-btn--active"
                      : ""
                  }`}
                  onClick={() => setView("fiscal-next")}
                >
                  <span className="booking-invoice-panel__list-number">
                    {t("nextInvoicePreview")}
                  </span>
                  <span className="booking-invoice-panel__list-meta">
                    {formatMoney(nextInvoiceAmount)}
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section
        className="booking-invoice-panel__list admin-surface-card"
        aria-label={t("proformaList")}
      >
        <h3 className="booking-invoice-panel__list-title">{t("proformaList")}</h3>
        <ul className="booking-invoice-panel__list-items">
          {proformas.map((pf) => (
            <li key={pf.id}>
              <button
                type="button"
                className={`booking-invoice-panel__list-btn${
                  view === `proforma-${pf.id}`
                    ? " booking-invoice-panel__list-btn--active"
                    : ""
                }`}
                onClick={() => setView(`proforma-${pf.id}`)}
              >
                <span className="booking-invoice-panel__list-number">
                  {pf.display_number}
                </span>
                <span className="booking-invoice-panel__list-meta">
                  {t("kindProforma")}
                  {pf.converted_to_invoice_id ? ` · ${t("converted")}` : ""}
                  {" · "}
                  {formatMoney(pf.total)}
                </span>
              </button>
            </li>
          ))}
          {canIssueProforma ? (
            <li>
              <button
                type="button"
                className={`booking-invoice-panel__list-btn${
                  view === "proforma-next"
                    ? " booking-invoice-panel__list-btn--active"
                    : ""
                }`}
                onClick={() => setView("proforma-next")}
              >
                <span className="booking-invoice-panel__list-number">
                  {t("nextProformaPreview")}
                </span>
                <span className="booking-invoice-panel__list-meta">
                  {formatMoney(nextProformaAmount)}
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      </section>

      {!isProformaView && canIssueNext && view === "fiscal-next" ? (
        <div className="booking-invoice-panel__summary no-print">
          {uninvoicedPaid > 0 ? (
            <p className="booking-invoice-panel__hint">
              {t("uninvoicedPaidHint", { amount: formatMoney(uninvoicedPaid) })}
            </p>
          ) : null}
          <p className="booking-invoice-panel__hint">
            {t("remainingToInvoiceHint", {
              amount: formatMoney(remainingToInvoice),
            })}
          </p>
        </div>
      ) : null}

      {isProformaView && canIssueProforma && view === "proforma-next" ? (
        <div className="booking-invoice-panel__summary no-print">
          <p className="booking-invoice-panel__hint">{t("proformaHint")}</p>
        </div>
      ) : null}

      {viewingConvertedProforma ? (
        <p className="booking-invoice-panel__hint no-print">{t("proformaConvertedHint")}</p>
      ) : null}

      <IssuedInvoiceView
        document={viewDocument}
        showPlatformBranding={showPlatformBranding}
        issued={viewingIssued}
        variant={isProformaView ? "proforma" : "fiscal"}
        onIssue={
          !isProformaView && canIssueNext && view === "fiscal-next"
            ? handleIssue
            : isProformaView && canIssueProforma && view === "proforma-next"
              ? handleIssueProforma
              : undefined
        }
        issuing={isProformaView ? issuingProforma : issuing}
        issueLabel={
          isProformaView
            ? t("issueProforma")
            : invoices.length > 0
              ? t("issueNextInvoice")
              : t("issueInvoice")
        }
        canConvert={
          Boolean(selectedProforma?.canConvert) && !viewingConvertedProforma
        }
        onConvert={
          selectedProforma?.canConvert && !viewingConvertedProforma
            ? handleConvert
            : undefined
        }
        converting={converting}
        convertLabel={t("convertToAdvance")}
        showAnafBadge={fiscalProvider === "anaf" && Boolean(selectedInvoice)}
        anafStatus={selectedAnafStatus}
      />
    </div>
  );
}
