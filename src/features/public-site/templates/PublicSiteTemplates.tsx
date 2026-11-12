import type {
  PublicSiteConfig,
  PublicSiteSection,
  PublicTemplateId,
} from "@/features/public-site/domain/types";
import { orderPublicSections } from "@/features/public-site/domain/order-sections";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import { PublicMobileBookingBar } from "@/features/public-site/home/PublicMobileBookingBar";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { sectionKind } from "@/features/public-site/sections/kinds";
import { renderPublicSection } from "@/features/public-site/sections/registry";
import { readSectionStyle, sectionLook } from "@/features/public-site/domain/section-style";
import { sectionAnchor } from "@/features/public-site/domain/site-pages";

export function TemplateSections({
  sections,
  config,
  locale,
  template,
  preview,
}: {
  sections: PublicSiteSection[];
  config: PublicSiteConfig;
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
        // A section may take another layout's look; renderers and CSS follow its look.
        const style = readSectionStyle(section.payload.style);
        const look = sectionLook(style, template);
        const content = renderPublicSection(section, { locale, template: look, config, preview });
        // No empty wrapper for a hidden or empty section: layouts style by position.
        if (!content) return null;
        return (
          <div
            key={`${section.id}-${index}`}
            id={sectionAnchor(section.id)}
            className="pub-home__section"
            data-look={look}
            data-bg={style.background === "auto" ? undefined : style.background}
            data-width={style.width === "auto" ? undefined : style.width}
            data-align={style.align === "auto" ? undefined : style.align}
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
 * The homepage, top to bottom: hero, the operator's sections in their order
 * (rooms and map among them), then the closing booking band. The three layouts
 * share this structure and differ in the hero and in CSS.
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
  const pinnedLast = (section: PublicSiteSection) => Boolean(sectionKind(section.sectionType).pinnedLast);
  const body = (
    <>
      <TemplateSections
        sections={[...ordered.filter((section) => !pinnedLast(section)), ...ordered.filter(pinnedLast)]}
        config={config}
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
      {/* Keyed by layout: switching it in the studio redraws the top button the bar watches. */}
      <PublicMobileBookingBar key={template} config={config} locale={locale} preview={preview} />
    </main>
  );
}
