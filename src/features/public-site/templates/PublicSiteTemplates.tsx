import type { ReactNode } from "react";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { PublicHomeExtras } from "@/features/public-site/home/PublicHomeExtras";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { renderPublicSection } from "@/features/public-site/sections/render-section";

type TemplateProps = {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
  afterHero?: ReactNode;
  preview?: boolean;
};

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
      {config.sections.map((section) => (
        <div key={section.id}>{renderPublicSection(section, locale, "classic")}</div>
      ))}
    </main>
  );
}

export function EditorialPublicTemplate({
  config,
  locale,
  checkTimesLabel,
  afterHero,
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
      {afterHero}
      <div className="pub-home__stack">
        {config.sections.map((section, index) => (
          <div
            key={section.id}
            className={index % 2 === 1 ? "pub-home__stack-row pub-home__stack-row--alt" : "pub-home__stack-row"}
          >
            {renderPublicSection(section, locale, "editorial")}
          </div>
        ))}
      </div>
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
        {config.sections.map((section) => (
          <div key={section.id}>{renderPublicSection(section, locale, "immersive")}</div>
        ))}
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
  const afterHero = (
    <PublicHomeExtras config={config} locale={locale} preview={preview} />
  );

  switch (config.templateId) {
    case "editorial":
      return (
        <EditorialPublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          afterHero={afterHero}
          preview={preview}
        />
      );
    case "immersive":
      return (
        <ImmersivePublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          afterHero={afterHero}
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
          afterHero={afterHero}
          preview={preview}
        />
      );
  }
}
