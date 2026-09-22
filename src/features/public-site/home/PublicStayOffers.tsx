"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  formatStayFromPrice,
  shouldShowStayOffers,
} from "@/features/public-site/domain/stay-offers";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

export function PublicStayOffers({
  config,
  locale,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
}) {
  const t = useTranslations("public.home");
  if (!shouldShowStayOffers(config.chrome, config.stayOffers)) return null;

  const showPrices = config.chrome.showStayPrices !== false;

  return (
    <section className="pub-section pub-section--stays" aria-labelledby="pub-stays-title">
      <div className="pub-section__inner">
        <h2 id="pub-stays-title" className="pub-section__title">
          {t("roomsTitle")}
        </h2>
        <p className="pub-section__lead">{t("roomsLead")}</p>
        <div className="pub-stays">
          {config.stayOffers.map((offer) => (
            <article key={offer.id} className="pub-stay">
              <h3 className="pub-stay__name">{offer.name}</h3>
              <p className="pub-stay__meta">
                {t("roomsCapacity", { count: offer.capacity })}
                {offer.roomCount > 1
                  ? ` · ${t("roomsCount", { count: offer.roomCount })}`
                  : null}
              </p>
              {showPrices && offer.fromPrice != null ? (
                <p className="pub-stay__price">
                  {t("roomsFrom", { price: formatStayFromPrice(offer.fromPrice, locale) })}
                </p>
              ) : null}
              {config.bookingEnabled ? (
                preview ? (
                  <span className="pub-stay__cta">{t("roomsCta")}</span>
                ) : (
                  <Link href="/calendar" className="pub-stay__cta">
                    {t("roomsCta")}
                  </Link>
                )
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
