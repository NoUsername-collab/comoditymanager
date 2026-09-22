import type { ReactNode } from "react";
import type { PublicSiteConfig, PublicTemplateId } from "@/features/public-site/domain/types";
import { orderPublicSections } from "@/features/public-site/domain/order-sections";
import { PublicHomeExtras } from "@/features/public-site/home/PublicHomeExtras";
import { PublicPlace } from "@/features/public-site/home/PublicPlace";
import { PublicStayOffers } from "@/features/public-site/home/PublicStayOffers";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { renderPublicSection } from "@/features/public-site/sections/render-section";

type TemplateProps = {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
  afterHero?: ReactNode;
  preview?: boolean;
};

function LiveProperty({
  config,
  locale,
  preview,
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
}) {
  return (
    <>
      <PublicStayOffers config={config} locale={locale} preview={preview} />
      <PublicPlace config={config} />
    </>
  );
}

function TemplateSections({
  config,
  locale,
  template,
}: {
  config: PublicSiteConfig;
  locale: string;
  template: PublicTemplateId;
}) {
  return (
    <>
      {orderPublicSections(config.sections).map((section) => (
        <div key={section.id}>{renderPublicSection(section, locale, template)}</div>
      ))}
    </>
  );
}

export function ClassicPublicTemplate({
  config,
  locale,
  checkTimesLabel,
  afterHero,
  preview = false,
}: TemplateProps) {
  return (
    <main className="pub-home pub-home--classic">
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant="classic"
        checkTimesLabel={checkTimesLabel}
        preview={preview}
      />
      {afterHero}
      <TemplateSections config={config} locale={locale} template="classic" />
      <LiveProperty config={config} locale={locale} preview={preview} />
    </main>
  );
}

export function EditorialPublicTemplate({
  config,
  locale,
  checkTimesLabel,
  preview = false,
}: TemplateProps) {
  return (
    <main className="pub-home pub-home--editorial">
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant="editorial"
        checkTimesLabel={checkTimesLabel}
        preview={preview}
      />
      <TemplateSections config={config} locale={locale} template="editorial" />
      <LiveProperty config={config} locale={locale} preview={preview} />
    </main>
  );
}

export function ImmersivePublicTemplate({
  config,
  locale,
  checkTimesLabel,
  afterHero,
  preview = false,
}: TemplateProps) {
  return (
    <main className="pub-home pub-home--immersive">
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant="immersive"
        checkTimesLabel={checkTimesLabel}
        preview={preview}
      />
      {afterHero}
      <div className="pub-home__immersive-body">
        <TemplateSections config={config} locale={locale} template="immersive" />
        <LiveProperty config={config} locale={locale} preview={preview} />
      </div>
    </main>
  );
}

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
  const extras =
    config.templateId === "classic" ? (
      <PublicHomeExtras
        config={config}
        locale={locale}
        preview={preview}
        layout="classic"
      />
    ) : null;

  switch (config.templateId) {
    case "editorial":
      return (
        <EditorialPublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          preview={preview}
        />
      );
    case "immersive":
      return (
        <ImmersivePublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          afterHero={extras}
          preview={preview}
        />
      );
    case "classic":
    default:
      return (
        <ClassicPublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          afterHero={extras}
          preview={preview}
        />
      );
  }
}
