import type { ReactNode } from "react";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { PublicHomeExtras } from "@/features/public-site/home/PublicHomeExtras";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { renderPublicSection } from "@/features/public-site/sections/render-section";
import { getTranslations } from "next-intl/server";

export function ClassicPublicTemplate({
  config,
  locale,
  checkTimesLabel,
  afterHero,
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
  afterHero?: ReactNode;
}) {
  return (
    <main className="pub-home pub-home--classic">
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant="classic"
        checkTimesLabel={checkTimesLabel}
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
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
  afterHero?: ReactNode;
}) {
  return (
    <main className="pub-home pub-home--editorial">
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant="editorial"
        checkTimesLabel={checkTimesLabel}
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
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
  afterHero?: ReactNode;
}) {
  return (
    <main className="pub-home pub-home--immersive">
      <PublicHeroBlock
        config={config}
        locale={locale}
        variant="immersive"
        checkTimesLabel={checkTimesLabel}
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

export async function PublicSitePage({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = await getTranslations("public.home");
  const checkTimesLabel = t("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });
  const afterHero = <PublicHomeExtras config={config} locale={locale} />;

  switch (config.templateId) {
    case "editorial":
      return (
        <EditorialPublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          afterHero={afterHero}
        />
      );
    case "immersive":
      return (
        <ImmersivePublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          afterHero={afterHero}
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
        />
      );
  }
}
