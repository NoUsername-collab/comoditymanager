"use client";

import { useTranslations } from "next-intl";
import {
  publicMapEmbedSrc,
  publicMapHref,
  shouldShowPlace,
} from "@/features/public-site/domain/stay-offers";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

export function PublicPlace({ config }: { config: PublicSiteConfig }) {
  const t = useTranslations("public.home");
  if (!shouldShowPlace(config.chrome, config.place)) return null;

  const href = publicMapHref(config.place);
  const embed = publicMapEmbedSrc(config.place);
  const address = config.place.address?.trim() || null;

  return (
    <section className="pub-section pub-section--place" aria-labelledby="pub-place-title">
      <div className="pub-section__inner">
        <h2 id="pub-place-title" className="pub-section__title">
          {t("placeTitle")}
        </h2>
        {address ? <p className="pub-place__address">{address}</p> : null}
        {embed ? (
          <iframe
            className="pub-place__map"
            title={t("placeAria")}
            src={embed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : null}
        {href ? (
          <a
            className="pub-place__link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("placeMap")}
          </a>
        ) : null}
      </div>
    </section>
  );
}
