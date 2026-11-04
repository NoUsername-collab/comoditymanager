"use client";

import { useLocale, useTranslations } from "next-intl";
import { PublicContactBar } from "@/features/public-site/contact/PublicContactBar";
import { publicChromeFontStack } from "@/features/public-site/domain/chrome";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import { PublicSiteBody } from "@/features/public-site/templates/PublicSiteTemplates";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import { PublicFooter } from "@/features/public-site/ui/PublicFooter";
import { PublicHeader } from "@/features/public-site/ui/PublicHeader";
import type { CSSProperties } from "react";
import "@/styles/features/public/public-site.css";
import "@/styles/features/public/public-site-v2.css";
import "@/styles/features/public/public-site-layouts.css";

/** The homepage as visitors will see it, built from the same header, body and footer as the live site. */
export function PublicSitePreview({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const tFooter = useTranslations("public.footer");
  const tHome = useTranslations("public.home");
  const tContact = useTranslations("public.contact");
  const activeLocale = useLocale();
  const previewLocale = locale || activeLocale;

  const checkTimesLabel = tHome("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });
  const themeStyle = resolvePublicThemeStyle(config.themeId);
  const fontStack = publicChromeFontStack(config.chrome.fontId);
  const style = (
    fontStack
      ? { ...themeStyle, "--pub-font-display": fontStack, "--public-font-serif": fontStack }
      : themeStyle
  ) as CSSProperties;

  return (
    <div
      className={["settings-public-preview", "pub-site", publicThemeClassName(config.themeId)].join(
        " ",
      )}
      style={style}
      data-pub-template={effectivePublicTemplate(config)}
    >
      <PublicHeader config={config} locale={previewLocale} preview />

      <PublicSiteBody
        config={config}
        locale={previewLocale}
        checkTimesLabel={checkTimesLabel}
        preview
      />

      {config.chrome.showContactBar !== false ? (
        <PublicContactBar
          contact={config.contact}
          title={tFooter("contact")}
          emptyHint={tFooter("contactEmptyHint")}
          labels={{
            email: tContact("email"),
            whatsapp: tContact("whatsapp"),
            telegram: tContact("telegram"),
            facebook: tContact("facebook"),
            instagram: tContact("instagram"),
          }}
        />
      ) : null}

      <PublicFooter config={config} locale={previewLocale} preview />
    </div>
  );
}
