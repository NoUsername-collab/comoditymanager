import Image from "next/image";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { orderPublicSections } from "@/features/public-site/domain/order-sections";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import type { PublicSiteConfig, PublicSitePage, PublicSiteSection } from "@/features/public-site/domain/types";
import { sectionKind } from "@/features/public-site/sections/kinds";
import { TemplateSections } from "@/features/public-site/templates/PublicSiteTemplates";

/**
 * One of the site's own pages: its title over its photo (or on its own), the
 * line under it, then its sections in the page layout, like the first page's.
 */
export function PublicOwnPageBody({
  config,
  page,
  locale,
  preview = false,
}: {
  config: PublicSiteConfig;
  page: PublicSitePage;
  locale: string;
  preview?: boolean;
}) {
  const template = effectivePublicTemplate(config);
  const title = pickOwnLocalized(page.title, locale);
  const lead = pickOwnLocalized(page.lead, locale);
  const ordered = orderPublicSections(page.sections);
  const pinnedLast = (section: PublicSiteSection) => Boolean(sectionKind(section.sectionType).pinnedLast);
  const body = (
    <TemplateSections
      sections={[...ordered.filter((section) => !pinnedLast(section)), ...ordered.filter(pinnedLast)]}
      config={config}
      locale={locale}
      template={template}
      preview={preview}
    />
  );

  return (
    <main className={`pub-home pub-home--${template} pub-own-page`}>
      <header
        className={["pub-page-head", page.imageUrl ? "pub-page-head--photo" : ""].filter(Boolean).join(" ")}
        data-pub-page-head={preview ? "1" : undefined}
      >
        {page.imageUrl ? (
          <figure className="pub-page-head__photo">
            <Image
              src={page.imageUrl}
              alt=""
              fill
              sizes="100vw"
              loading="eager"
              fetchPriority="high"
              unoptimized={!isOptimizablePublicImageUrl(page.imageUrl)}
              className="pub-page-head__media"
            />
          </figure>
        ) : null}
        <div className="pub-page-head__inner">
          {title ? <h1 className="pub-page-head__title">{title}</h1> : null}
          {lead ? <p className="pub-page-head__lead">{lead}</p> : null}
        </div>
      </header>
      {template === "immersive" ? <div className="pub-home__immersive-body">{body}</div> : body}
    </main>
  );
}
