import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";

/**
 * "This page does not exist" on a guesthouse site: inside the site's own header,
 * menu and colours, with the way back to the first page and to booking.
 */
export async function PublicNotFound() {
  const [t, config] = await Promise.all([getTranslations("public.notFound"), loadPublicSiteConfig()]);

  return (
    <main className="public-page ml-content">
      <div className="public-page__inner public-page__inner--narrow pub-not-found">
        <header className="public-page__head">
          <p className="public-page__eyebrow">{t("eyebrow")}</p>
          <h1 className="public-page__title">{t("title")}</h1>
          <p className="public-page__lead">{t("lead")}</p>
        </header>
        <div className="pub-not-found__actions">
          <Link href="/" className="pub-btn pub-btn--primary">
            {t("home")}
          </Link>
          {config.bookingEnabled ? (
            <Link href="/calendar" className="pub-btn pub-btn--ghost">
              {t("booking")}
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
