import { pickOwnLocalized, storedTitle } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

export function PublicUnpublishedPage({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const storedHeading = pickOwnLocalized(config.pages.comingSoonTitle, locale);
  const title = storedTitle(config.pages.comingSoonTitle, locale, config.displayName);
  const lead = pickOwnLocalized(config.pages.comingSoonLead, locale);

  return (
    <main className="pub-home pub-unpublished">
      <section className="pub-hero pub-hero--classic">
        <div className="pub-hero__inner">
          {storedHeading ? <p className="pub-hero__badge">{config.displayName}</p> : null}
          <h1 className="pub-hero__title">{title}</h1>
          {lead ? <p className="pub-hero__subtitle">{lead}</p> : null}
        </div>
      </section>
    </main>
  );
}
