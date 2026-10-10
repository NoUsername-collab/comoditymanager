"use client";

import { useTranslations } from "next-intl";
import { PUBLIC_LOCALES, type PublicLocale } from "@/features/public-site/domain/types";

export function PublicSiteLocaleTabs({
  value,
  onChange,
  disabled,
  variant = "form",
  progress,
}: {
  value: PublicLocale;
  onChange: (locale: PublicLocale) => void;
  disabled?: boolean;
  variant?: "form" | "chrome";
  /** 0–100 copy completion per language; shown as ✓ or a percent. */
  progress?: Record<PublicLocale, number>;
}) {
  const t = useTranslations("admin.pages.publicSite");

  return (
    <div
      className={["pub-locale-tabs", variant === "chrome" && "pub-locale-tabs--chrome"]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label={t("studioLocaleAria")}
    >
      {PUBLIC_LOCALES.map((locale) => {
        const selected = value === locale;
        const percent = progress?.[locale];
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
            title={percent !== undefined ? t("editor.localeProgress", { percent }) : undefined}
          >
            <span className="pub-locale-tabs__code">{locale.toUpperCase()}</span>
            {variant === "form" ? (
              <span className="pub-locale-tabs__name">{t(`localeTab_${locale}`)}</span>
            ) : null}
            {percent !== undefined ? (
              <span
                className="pub-locale-tabs__progress"
                data-complete={percent === 100 ? "1" : undefined}
              >
                {percent === 100 ? "✓" : `${percent}%`}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
