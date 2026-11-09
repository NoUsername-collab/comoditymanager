import { Link } from "@/i18n/navigation";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { BookingBarReveal } from "@/features/public-site/home/BookingBarReveal";

/**
 * Phone-only booking button, on every layout. Render it as the last child of
 * `<main>`: a sticky bar stays at the bottom of the screen only while its spot
 * in the page is still below, so placed last it stays for the whole scroll.
 * It waits while the booking button at the top of the page is in view.
 */
export function PublicMobileBookingBar({
  config,
  locale,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
}) {
  const label = pickOwnLocalized(config.hero.ctaPrimary, locale);
  if (!config.bookingEnabled || !label) return null;

  return (
    <BookingBarReveal>
      {preview ? (
        <span className="pub-mobile-booking-bar__btn">{label}</span>
      ) : (
        <Link
          href={safeNavHref(config.hero.ctaPrimaryHref, "/calendar")}
          className="pub-mobile-booking-bar__btn"
        >
          {label}
        </Link>
      )}
    </BookingBarReveal>
  );
}
