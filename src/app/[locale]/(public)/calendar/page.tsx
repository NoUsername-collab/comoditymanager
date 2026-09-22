import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { GuestBookingFormLazy } from "@/features/public-site/ui/GuestBookingFormLazy";
import { PublicBookingNotice } from "@/features/public-site/ui/PublicBookingNotice";
import { PublicUnpublishedPage } from "@/features/public-site/ui/PublicUnpublishedPage";
import { buildBookingNoticePresetCopy } from "@/features/public-site/ui/booking-notice-copy";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { loadPublicCalendarPage, loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale, t] = await Promise.all([
    loadPublicSiteConfig(),
    getLocale(),
    getTranslations("public.calendar"),
  ]);
  const title = pickLocalized(config.pages.seoCalendarTitle, locale, [
    pickLocalized(config.pages.calendarTitle, locale, [config.displayName]),
  ]);
  const description = pickLocalized(config.pages.seoCalendarDescription, locale, [
    pickLocalized(config.pages.calendarLead, locale, [t("lead")]),
  ]);
  const image = config.pages.ogImageUrl || config.hero.imageUrl || null;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CalendarPublicPage() {
  const [t, tShell, config, locale, staff] = await Promise.all([
    getTranslations("public.calendar"),
    getTranslations("public.shell"),
    loadPublicCalendarPage(),
    getLocale(),
    getAdminUser().catch(() => null),
  ]);

  if (!config.published && !staff) {
    return <PublicUnpublishedPage config={config} locale={locale} />;
  }

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
  const title = pickLocalized(config.pages.calendarTitle, locale, [config.displayName]);
  const lead = pickLocalized(config.pages.calendarLead, locale, [t("lead")]);

  return (
    <main className="pub-booking-page ml-content">
      <Link href="/" className="public-back-link">
        ← {tShell("backHome")}
      </Link>
      <header className="pub-booking-page__head">
        <p className="pub-booking-page__eyebrow">{t("eyebrow")}</p>
        <h1 className="pub-booking-page__title">{title}</h1>
        <p className="pub-booking-page__lead">{lead}</p>
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
