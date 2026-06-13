import { getTranslations } from "next-intl/server";
import type { GuestAccessBookingSnapshot } from "@/domain/guest-app/types";

type Props = {
  booking: GuestAccessBookingSnapshot;
  locale: string;
};

function formatRon(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function GuestPaymentSummary({ booking, locale }: Props) {
  const t = await getTranslations("guestApp.payment");
  const total = booking.totalPrice;
  if (total == null || total <= 0) {
    return null;
  }

  const paid = booking.paymentAmountPaid ?? 0;
  const balance = Math.max(0, total - paid);
  const status = booking.paymentStatus ?? "unpaid";

  return (
    <div className="guest-app__payment-summary space-y-4">
      <div className="guest-app__panel">
        <dl className="guest-app__payment-dl">
          <div>
            <dt>{t("total")}</dt>
            <dd>{formatRon(total, locale)}</dd>
          </div>
          <div>
            <dt>{t("paid")}</dt>
            <dd>{formatRon(paid, locale)}</dd>
          </div>
          <div className="guest-app__payment-dl__balance">
            <dt>{t("balance")}</dt>
            <dd>{formatRon(balance, locale)}</dd>
          </div>
        </dl>
      </div>

      <p className="guest-app__subtle text-sm">
        {status === "paid"
          ? t("statusPaid")
          : status === "partial"
            ? t("statusPartial")
            : t("statusUnpaid")}
      </p>
      <p className="guest-app__muted text-xs">{t("receptionNote")}</p>
    </div>
  );
}
