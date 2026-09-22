import { pickLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { getTranslations } from "next-intl/server";

export async function PublicUnpublishedPage({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = await getTranslations("public.unpublished");
  const title = pickLocalized(config.pages.comingSoonTitle, locale, [t("title")]);
  const lead = pickLocalized(config.pages.comingSoonLead, locale, [t("lead")]);

  return (
    <main className="pub-home pub-unpublished">
      <section className="pub-hero pub-hero--classic">
        <div className="pub-hero__inner">
          <p className="pub-hero__badge">{config.displayName}</p>
          <h1 className="pub-hero__title">{title}</h1>
          <p className="pub-hero__subtitle">{lead}</p>
        </div>
      </section>
    </main>
  );
}
