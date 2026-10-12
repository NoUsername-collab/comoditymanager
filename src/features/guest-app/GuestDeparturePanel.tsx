import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GuestAccessBookingSnapshot, GuestAppFeatureDef } from "@/domain/guest-app/types";
import { guestAppFeatureHref } from "@/domain/guest-app/routes";
import { GuestFeedbackSection } from "@/features/guest-app/GuestFeedbackSection";

type Props = {
  accessCode: string;
  booking: GuestAccessBookingSnapshot;
  features: GuestAppFeatureDef[];
  locale: string;
  checkOutTime?: string | null;
  feedbackSubmitted: boolean;
};

function formatRon(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : locale === "bg" ? "bg-BG" : "en-GB", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function GuestDeparturePanel({
  accessCode,
  booking,
  features,
  locale,
  checkOutTime,
  feedbackSubmitted,
}: Props) {
  const t = await getTranslations("guestApp");
  const time = checkOutTime?.trim().slice(0, 5);
  const total = booking.totalPrice;
  const paid = booking.paymentAmountPaid ?? 0;
  const balance = total != null && total > 0 ? Math.max(0, total - paid) : null;
  const paymentVisible = features.some(
    (feature) => feature.id === "online_payment" && feature.state !== "hidden",
  );

  return (
    <section id="departure" className="guest-app__departure" aria-labelledby="guest-departure-title">
      <h2 id="guest-departure-title" className="guest-app__section-title">
        {t("home.departureTitle")}
      </h2>
      <p className="guest-app__departure__lead">
        {time ? t("home.departureUntil", { time }) : t("home.departureAskReception")}
      </p>
      {balance === 0 ? <p className="guest-app__subtle text-sm">{t("home.departurePaid")}</p> : null}
      {balance != null && balance > 0 ? (
        <p className="guest-app__subtle text-sm">
          {t("home.departureBalance", { amount: formatRon(balance, locale) })}
        </p>
      ) : null}
      {paymentVisible && balance != null ? (
        <Link
          href={guestAppFeatureHref(accessCode, "online_payment")}
          className="guest-app__inline-link"
        >
          {t("home.seePayment")}
        </Link>
      ) : null}
      <div className="guest-app__departure__feedback">
        <h3 className="guest-app__departure__feedback-title">{t("feedback.sectionTitle")}</h3>
        <GuestFeedbackSection accessCode={accessCode} alreadySubmitted={feedbackSubmitted} />
      </div>
    </section>
  );
}
