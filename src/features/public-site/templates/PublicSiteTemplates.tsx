import type {
  PublicSiteConfig,
  PublicSiteSection,
  PublicTemplateId,
} from "@/features/public-site/domain/types";
import { orderPublicSections } from "@/features/public-site/domain/order-sections";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import { PublicMobileBookingBar } from "@/features/public-site/home/PublicMobileBookingBar";
import { PublicPlace } from "@/features/public-site/home/PublicPlace";
import { PublicStayOffers } from "@/features/public-site/home/PublicStayOffers";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { renderPublicSection } from "@/features/public-site/sections/render-section";

function TemplateSections({
  sections,
  locale,
  template,
  preview,
}: {
  sections: PublicSiteSection[];
  locale: string;
  template: PublicTemplateId;
  preview: boolean;
}) {
  const seen = new Map<string, number>();
  return (
    <>
      {sections.map((section, index) => {
        // Preview only: the settings studio maps a click back to its editor card.
        // Counted before skipping: the studio's section order includes hidden ones.
        const nth = seen.get(section.sectionType) ?? 0;
        seen.set(section.sectionType, nth + 1);
        const content = renderPublicSection(section, locale, template);
        // No empty wrapper for a hidden or empty section: layouts style by position.
        if (!content) return null;
        return (
          <div
            key={`${section.id}-${index}`}
            data-pub-section={preview ? section.sectionType : undefined}
            data-pub-nth={preview ? nth : undefined}
          >
            {content}
          </div>
        );
      })}
    </>
  );
}

/**
 * The homepage, top to bottom: hero, the operator's sections in their order,
 * then rooms and the map, then the closing booking band, so the rooms come
 * before the final "book now" instead of after it. The three layouts share this
 * structure and differ in the hero and in CSS.
 */
export function PublicSiteBody({
  config,
  locale,
  checkTimesLabel,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
  preview?: boolean;
}) {
  const template = effectivePublicTemplate(config);
  const ordered = orderPublicSections(config.sections);
  const body = (
    <>
      <TemplateSections
        sections={ordered.filter((section) => section.sectionType !== "cta")}
        locale={locale}
        template={template}
        preview={preview}
      />
      <PublicStayOffers config={config} locale={locale} preview={preview} />
      <PublicPlace config={config} />
      <TemplateSections
        sections={ordered.filter((section) => section.sectionType === "cta")}
        locale={locale}
        template={template}
        preview={preview}
      />
    </>
  );

  return (
    <main className={`pub-home pub-home--${template}`}>
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant={template}
        checkTimesLabel={checkTimesLabel}
        preview={preview}
      />
      {template === "immersive" ? <div className="pub-home__immersive-body">{body}</div> : body}
      <PublicMobileBookingBar config={config} locale={locale} preview={preview} />
    </main>
  );
}
