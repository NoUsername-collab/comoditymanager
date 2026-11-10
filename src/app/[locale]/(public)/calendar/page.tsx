import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { GuestBookingFormLazy } from "@/features/public-site/ui/GuestBookingFormLazy";
import { PublicBookingNotice } from "@/features/public-site/ui/PublicBookingNotice";
import { PublicUnpublishedPage } from "@/features/public-site/ui/PublicUnpublishedPage";
import { buildBookingNoticePresetCopy } from "@/features/public-site/ui/booking-notice-copy";
import { pickOwnLocalized, storedTitle } from "@/features/public-site/domain/localized";
import { publicPageMetadata } from "@/features/public-site/page-metadata";
import { loadPublicCalendarPage, loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([loadPublicSiteConfig(), getLocale()]);
  const title = storedTitle(
    config.pages.seoCalendarTitle,
    locale,
    storedTitle(config.pages.calendarTitle, locale, config.displayName),
  );
  const description =
    pickOwnLocalized(config.pages.seoCalendarDescription, locale) ||
    pickOwnLocalized(config.pages.calendarLead, locale);
  return publicPageMetadata(config, { title, description });
}

export default async function CalendarPublicPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string | string[] }>;
}) {
  const [t, tShell, config, locale, staff, params] = await Promise.all([
    getTranslations("public.calendar"),
    getTranslations("public.shell"),
    loadPublicCalendarPage(),
    getLocale(),
    getAdminUser().catch(() => null),
    searchParams,
  ]);
  // A room card on the site sends its room type; only one the site lists counts.
  const roomParam = Array.isArray(params.room) ? params.room[0] : params.room;
  const preferredRoom = config.stayOffers.find((offer) => offer.id === roomParam);

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
  const title = storedTitle(config.pages.calendarTitle, locale, config.displayName);
  const lead = pickOwnLocalized(config.pages.calendarLead, locale);

  return (
    <main className="pub-booking-page ml-content">
      <Link href="/" className="public-back-link">
        ← {tShell("backHome")}
      </Link>
      <header className="pub-booking-page__head">
        <p className="pub-booking-page__eyebrow">{t("eyebrow")}</p>
        <h1 className="pub-booking-page__title">{title}</h1>
        {lead ? <p className="pub-booking-page__lead">{lead}</p> : null}
      </header>

      <div className="pub-booking-layout">
        <PublicBookingNotice
          notice={config.bookingNotice}
          locale={locale}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          presets={buildBookingNoticePresetCopy(t)}
        />

        <GuestBookingFormLazy
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          preferredRoom={preferredRoom ? { id: preferredRoom.id, name: preferredRoom.name } : null}
        />
      </div>
    </main>
  );
}
