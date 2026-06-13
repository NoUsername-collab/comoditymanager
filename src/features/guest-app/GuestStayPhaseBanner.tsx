import { getTranslations } from "next-intl/server";
import { daysUntilDate } from "@/lib/guest-app/stay-dates";
import {
  resolveGuestPhaseHintKey,
  resolveGuestStayPhase,
} from "@/domain/guest-app/stay-milestone";

type Props = {
  today: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
};

export async function GuestStayPhaseBanner({
  today,
  checkIn,
  checkOut,
  checkedInAt,
}: Props) {
  const t = await getTranslations("guestApp");
  const hintKey = resolveGuestPhaseHintKey({ today, checkIn, checkOut, checkedInAt });
  const phase = resolveGuestStayPhase({ today, checkIn, checkOut, checkedInAt });
  const daysToCheckout = daysUntilDate(today, checkOut);
  const daysToCheckin = daysUntilDate(today, checkIn);

  let meta: string | null = null;
  if (phase === "checked_in" && daysToCheckout > 0) {
    meta = t("home.daysUntilCheckout", { count: daysToCheckout });
  } else if (phase === "confirmed" && daysToCheckin > 0) {
    meta = t("home.daysUntilCheckin", { count: daysToCheckin });
  } else if (phase === "checked_in" && daysToCheckout === 0) {
    meta = t("home.checkoutTodayShort");
  }

  return (
    <section
      className={[
        "guest-app__phase-banner",
        `guest-app__phase-banner--${phase}`,
      ].join(" ")}
      aria-live="polite"
    >
      <p className="guest-app__phase-banner__text">{t(hintKey)}</p>
      {meta ? <p className="guest-app__phase-banner__meta">{meta}</p> : null}
    </section>
  );
}
