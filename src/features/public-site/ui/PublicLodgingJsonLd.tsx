import { lodgingBusinessJsonLd } from "@/features/public-site/domain/stay-offers";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

export function PublicLodgingJsonLd({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const json = lodgingBusinessJsonLd({
    displayName: config.displayName,
    locale,
    image: config.pages.ogImageUrl || config.hero.imageUrl || config.chrome.logoUrl,
    email: config.contact.email,
    phone: config.contact.phone,
    checkInTime: config.checkInTime,
    checkOutTime: config.checkOutTime,
    place: config.place,
  });

  return (
    <script
      type="application/ld+json"
      // Escape "<" so owner-written text (name, address) can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }}
    />
  );
}
