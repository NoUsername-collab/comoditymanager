"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { IssuedInvoiceDocument } from "@/domain/invoice/issued-invoice";
import { formatInvoiceMoney } from "@/domain/invoice/issued-invoice";
import { getCountryFiscalProfile } from "@/domain/fiscal/country-fiscal-profile";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { PLATFORM_NAME } from "@/lib/platform/branding";

type Props = {
  document: IssuedInvoiceDocument;
  showHospiraBranding: boolean;
  issued?: boolean;
  onIssue?: () => Promise<void>;
  issuing?: boolean;
};

export function IssuedInvoiceView({
  document,
  showHospiraBranding,
  issued = true,
  onIssue,
  issuing = false,
}: Props) {
  const t = useTranslations("admin.issuedInvoice");
  const locale = useLocale();
  const dateTag = locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB";
  const fiscalCountry =
    document.currency === "BGN"
      ? "BG"
      : document.currency === "MDL"
        ? "MD"
        : "RO";
  const taxIdLabel = getCountryFiscalProfile(fiscalCountry).taxIdLabel[
    locale === "bg" ? "bg" : locale === "en" ? "en" : "ro"
  ];
  const formatMoney = (amount: number) =>
    formatInvoiceMoney(amount, document.currency, dateTag);
  const [localIssuing, setLocalIssuing] = useState(false);

  const issuedLabel = new Date(document.issued_at).toLocaleDateString(dateTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function printInvoice() {
    window.print();
  }

  async function handleIssue() {
    if (!onIssue || localIssuing || issuing) return;
    setLocalIssuing(true);
    try {
      await onIssue();
    } finally {
      setLocalIssuing(false);
    }
  }

  return (
    <div className="issued-invoice-root">
      <div className="issued-invoice-actions no-print">
        {!issued && onIssue ? (
          <button
            type="button"
            className="checkin-stepper__btn checkin-stepper__btn--primary"
            disabled={localIssuing || issuing}
            onClick={() => void handleIssue()}
          >
            {localIssuing || issuing ? t("issuing") : t("issueInvoice")}
          </button>
        ) : null}
        <button
          type="button"
          className="checkin-stepper__btn checkin-stepper__btn--primary"
          onClick={printInvoice}
          disabled={!issued}
        >
          {t("savePdf")}
        </button>
      </div>

      <article className="issued-invoice-sheet" aria-label={t("title")}>
        <header className="issued-invoice-sheet__header">
          <div>
            <p className="issued-invoice-sheet__eyebrow">{t("documentTitle")}</p>
            <h1 className="issued-invoice-sheet__seller">{document.seller_name}</h1>
            {document.seller_address ? (
              <p className="issued-invoice-sheet__meta">{document.seller_address}</p>
            ) : null}
            <p className="issued-invoice-sheet__meta">
              {document.seller_cui ? `${taxIdLabel}: ${document.seller_cui}` : null}
              {document.seller_reg_com
                ? ` · ${t("regCom")}: ${document.seller_reg_com}`
                : null}
            </p>
          </div>
          <div className="issued-invoice-sheet__number-box">
            <span>{t("invoiceNumber")}</span>
            <strong>{document.display_number}</strong>
            <span>{t("issuedAt")}: {issuedLabel}</span>
          </div>
        </header>

        <section className="issued-invoice-sheet__parties">
          <div>
            <p className="issued-invoice-sheet__label">{t("buyer")}</p>
            <p className="issued-invoice-sheet__value">{document.buyer_name}</p>
            <p className="issued-invoice-sheet__meta">{document.buyer_email}</p>
            {document.buyer_phone ? (
              <p className="issued-invoice-sheet__meta">{document.buyer_phone}</p>
            ) : null}
          </div>
          <div>
            <p className="issued-invoice-sheet__label">{t("stay")}</p>
            <p className="issued-invoice-sheet__value">
              {formatStayPeriod(document.check_in, document.check_out, true)}
            </p>
            <p className="issued-invoice-sheet__meta">
              {document.nights}{" "}
              {document.nights === 1 ? t("night") : t("nights")}
            </p>
          </div>
        </section>

        <div className="issued-invoice-sheet__table-wrap">
          <table className="issued-invoice-sheet__table">
            <thead>
              <tr>
                <th>{t("colDescription")}</th>
                <th>{t("colQty")}</th>
                <th>{t("colUnit")}</th>
                <th>{t("colTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {document.lines.map((line, index) => (
                <tr key={`${line.room_id ?? "line"}-${index}`}>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{formatMoney(line.unit_price)}</td>
                  <td>{formatMoney(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="issued-invoice-sheet__footer">
          <div className="issued-invoice-sheet__totals">
            {document.vat_amount > 0 ? (
              <>
                <div>
                  <span>{t("subtotalNet")}</span>
                  <strong>{formatMoney(document.subtotal_net)}</strong>
                </div>
                <div>
                  <span>
                    {t("vatAmount", { rate: document.vat_rate })}
                  </span>
                  <strong>{formatMoney(document.vat_amount)}</strong>
                </div>
              </>
            ) : (
              <div>
                <span>{t("subtotal")}</span>
                <strong>{formatMoney(document.subtotal)}</strong>
              </div>
            )}
            <div className="issued-invoice-sheet__total-row">
              <span>{t("total")}</span>
              <strong>{formatMoney(document.total)}</strong>
            </div>
          </div>
          <p className="issued-invoice-sheet__legal">{document.legal_note}</p>
          {showHospiraBranding ? (
            <p className="issued-invoice-sheet__brand">
              {t("poweredBy", { brand: PLATFORM_NAME })}
            </p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
