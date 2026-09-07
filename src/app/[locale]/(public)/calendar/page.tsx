import { Link } from "@/i18n/navigation";
import { GuestBookingFormLazy } from "@/features/public-site/ui/GuestBookingFormLazy";
import { PublicBookingNotice } from "@/features/public-site/ui/PublicBookingNotice";
import { buildBookingNoticePresetCopy } from "@/features/public-site/ui/booking-notice-copy";
import { loadPublicCalendarPage } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";

export default async function CalendarPublicPage() {
  const [t, tShell, config, locale] = await Promise.all([
    getTranslations("public.calendar"),
    getTranslations("public.shell"),
    loadPublicCalendarPage(),
    getLocale(),
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
        <PublicBookingNotice
          notice={config.bookingNotice}
          locale={locale}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          fallbackTitle={t("asideTitle")}
          fallbackFooter={t("surplusNote")}
          presets={buildBookingNoticePresetCopy(t)}
        />

        <GuestBookingFormLazy checkInTime={checkInTime} checkOutTime={checkOutTime} />
      </div>
    </main>
  );
}
