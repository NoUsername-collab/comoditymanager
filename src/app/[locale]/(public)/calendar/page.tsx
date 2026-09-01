import { Link } from "@/i18n/navigation";
import { GuestBookingFormLazy } from "@/features/public-site/ui/GuestBookingFormLazy";
import { loadPublicCalendarPage } from "@/features/public-site/loaders";
import { getTranslations } from "next-intl/server";

export default async function CalendarPublicPage() {
  const [t, tShell, config] = await Promise.all([
    getTranslations("public.calendar"),
    getTranslations("public.shell"),
    loadPublicCalendarPage(),
  ]);

  if (!config.bookingEnabled) {
    return (
      <main className="pub-booking-page ml-content">
        <div className="pub-booking-page__head">
          <p className="pub-booking-page__eyebrow">{t("eyebrow")}</p>
          <h1 className="pub-booking-page__title">{t("disabledTitle")}</h1>
          <p className="pub-booking-page__lead">{t("disabledLead")}</p>
          <Link href="/" className="pub-btn pub-btn--primary mt-4 inline-flex">
            {tShell("backHome")}
          </Link>
        </div>
      </main>
    );
  }

  const checkInTime = config.checkInTime;
  const checkOutTime = config.checkOutTime;

  return (
    <main className="pub-booking-page ml-content">
      <Link href="/" className="public-back-link">
        ← {tShell("backHome")}
      </Link>
      <header className="pub-booking-page__head">
        <p className="pub-booking-page__eyebrow">{t("eyebrow")}</p>
        <h1 className="pub-booking-page__title">{config.displayName}</h1>
        <p className="pub-booking-page__lead">{t("lead")}</p>
      </header>

      <div className="pub-booking-layout">
        <aside className="pub-booking-aside">
          <p className="text-sm font-semibold text-[var(--site-fg)]">{t("asideTitle")}</p>
          <ul className="pub-booking-aside__list">
            <li className="pub-booking-aside__item">
              <span aria-hidden>✓</span>
              <span>
                <strong>{t("asideNoPayTitle")}</strong>
                {t("asideNoPayText")}
              </span>
            </li>
            <li className="pub-booking-aside__item">
              <span aria-hidden>⏱</span>
              <span>
                <strong>{t("asideHoldTitle")}</strong>
                {t("asideHoldText")}
              </span>
            </li>
            <li className="pub-booking-aside__item">
              <span aria-hidden>🕐</span>
              <span>
                <strong>{t("asideHoursTitle")}</strong>
                {t("asideHoursText", { checkIn: checkInTime, checkOut: checkOutTime })}
              </span>
            </li>
          </ul>
          <p className="pub-booking-surplus-note">{t("surplusNote")}</p>
        </aside>

        <GuestBookingFormLazy checkInTime={checkInTime} checkOutTime={checkOutTime} />
      </div>
    </main>
  );
}
