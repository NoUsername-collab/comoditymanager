"use client";

import { useTranslations } from "next-intl";
import { PUBLIC_LOCALES, type PublicLocale } from "@/features/public-site/domain/types";

export function PublicSiteLocaleTabs({
  value,
  onChange,
  disabled,
}: {
  value: PublicLocale;
  onChange: (locale: PublicLocale) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.pages.publicSite");

  return (
    <div className="pub-locale-tabs" role="tablist" aria-label={t("studioLocaleAria")}>
      {PUBLIC_LOCALES.map((locale) => {
        const selected = value === locale;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            className={[
              "pub-locale-tabs__tab",
              selected && "pub-locale-tabs__tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onChange(locale)}
          >
            <span className="pub-locale-tabs__code">{locale.toUpperCase()}</span>
            <span className="pub-locale-tabs__name">{t(`localeTab_${locale}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
