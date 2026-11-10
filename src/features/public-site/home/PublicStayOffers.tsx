import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import {
  formatStayFromPrice,
  shouldShowStayOffers,
} from "@/features/public-site/domain/stay-offers";
import type {
  PublicSectionPayloadByType,
  PublicSiteConfig,
} from "@/features/public-site/domain/types";
import { copy } from "@/features/public-site/sections/shell";

/**
 * The room types from the room settings, each with the photo and words the
 * operator gave it on the site. How many rooms of a type there are is the
 * house's own business, so the page does not say.
 */
export function PublicStayOffers({
  config,
  locale,
  payload,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  payload: PublicSectionPayloadByType["stays"];
  preview?: boolean;
}) {
  const t = useTranslations("public.home");
  if (!shouldShowStayOffers(config.stayOffers)) return null;

  const showPrices = payload.showPrices !== false;
  const title = copy(payload.title, locale) || t("roomsTitle");
  const lead = copy(payload.lead, locale) || t("roomsLead");
  const byType = new Map((payload.items ?? []).map((item) => [item.roomTypeId, item]));
  const withPhotos = config.stayOffers.some((offer) => offer.photos.length > 0);

  return (
    <section className="pub-section pub-section--stays" aria-labelledby="pub-stays-title">
      <div className="pub-section__inner">
        <h2 id="pub-stays-title" className="pub-section__title">
          {title}
        </h2>
        {lead ? <p className="pub-section__lead">{lead}</p> : null}
        <div className={withPhotos ? "pub-stays pub-stays--photos" : "pub-stays"}>
          {config.stayOffers.map((offer) => {
            const extra = byType.get(offer.id);
            const photo = offer.photos[0];
            const text = copy(extra?.text, locale);
            return (
              <article key={offer.id} className="pub-stay">
                {photo ? (
                  <figure className="pub-stay__photo">
                    <Image
                      src={photo.url}
                      alt={copy(photo.alt, locale) || offer.name}
                      fill
                      sizes="(max-width: 720px) 100vw, 33vw"
                      style={{ objectPosition: photo.focus }}
                      unoptimized={!isOptimizablePublicImageUrl(photo.url)}
                    />
                  </figure>
                ) : withPhotos ? (
                  <div className="pub-stay__photo pub-stay__photo--empty" aria-hidden />
                ) : null}
                <div className="pub-stay__body">
                  <h3 className="pub-stay__name">{offer.name}</h3>
                  <p className="pub-stay__meta">{t("roomsCapacity", { count: offer.capacity })}</p>
                  {text ? <p className="pub-stay__text">{text}</p> : null}
                  {showPrices && offer.fromPrice != null ? (
                    <p className="pub-stay__price">
                      {t("roomsFrom", { price: formatStayFromPrice(offer.fromPrice, locale) })}
                    </p>
                  ) : null}
                  {config.bookingEnabled ? (
                    preview ? (
                      <span className="pub-stay__cta">{t("roomsCta")}</span>
                    ) : (
                      <Link
                        href={{ pathname: "/calendar", query: { room: offer.id } }}
                        className="pub-stay__cta"
                      >
                        {t("roomsCta")}
                      </Link>
                    )
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
