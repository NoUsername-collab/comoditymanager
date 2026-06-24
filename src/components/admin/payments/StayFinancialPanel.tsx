import { getLocale, getTranslations } from "next-intl/server";
import type { FinancialSnapshot } from "@/domain/payments/types";
import { formatInvoiceMoney } from "@/domain/invoice/issued-invoice";
import { RecordPaymentForm } from "@/components/admin/payments/RecordPaymentForm";

type Props = {
  bookingId: string;
  snapshot: FinancialSnapshot;
};

function formatMoney(amount: number, locale: string): string {
  try {
    return formatInvoiceMoney(amount, "RON", locale);
  } catch {
    return `${amount.toFixed(2)} RON`;
  }
}

export async function StayFinancialPanel({ bookingId, snapshot }: Props) {
  const t = await getTranslations("admin.financial");
  const locale = await getLocale();

  return (
    <section
      id="stay-financial"
      className="stay-financial admin-surface-card"
      aria-label={t("title")}
    >
      <h3 className="stay-financial__title">{t("title")}</h3>

      <dl className="stay-financial__grid">
        <div className="stay-financial__row">
          <dt>{t("totalDue")}</dt>
          <dd>{formatMoney(snapshot.totalDue, locale)}</dd>
        </div>
        <div className="stay-financial__row">
          <dt>{t("totalPaid")}</dt>
          <dd>{formatMoney(snapshot.totalPaid, locale)}</dd>
        </div>
        <div
          className={`stay-financial__row${
            snapshot.balanceDue > 0 ? " stay-financial__row--due" : ""
          }`}
        >
          <dt>{t("balanceDue")}</dt>
          <dd>{formatMoney(snapshot.balanceDue, locale)}</dd>
        </div>
        {snapshot.totalInvoiced > 0 ? (
          <div className="stay-financial__row">
            <dt>{t("totalInvoiced")}</dt>
            <dd>{formatMoney(snapshot.totalInvoiced, locale)}</dd>
          </div>
        ) : null}
        {snapshot.uninvoicedPaid > 0 ? (
          <div className="stay-financial__row stay-financial__row--due">
            <dt>{t("uninvoicedPaid")}</dt>
            <dd>{formatMoney(snapshot.uninvoicedPaid, locale)}</dd>
          </div>
        ) : null}
      </dl>

      {snapshot.payments.length > 0 ? (
        <div className="stay-financial__history">
          <h4 className="stay-financial__history-title">{t("history")}</h4>
          <ul className="stay-financial__history-list">
            {snapshot.payments.map((p) => (
              <li key={p.id} className="stay-financial__history-item">
                <span className="stay-financial__history-date">
                  {new Date(p.paid_at).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="stay-financial__history-amount">
                  {p.kind === "refund" ? "\u2212" : "+"}
                  {formatMoney(p.amount, locale)}
                </span>
                <span className="stay-financial__history-meta">
                  {t(`method_${p.method}`)}
                  {p.payer_name ? ` \u00b7 ${p.payer_name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="stay-financial__empty">{t("noPayments")}</p>
      )}

      <RecordPaymentForm bookingId={bookingId} balanceDue={snapshot.balanceDue} />
    </section>
  );
}