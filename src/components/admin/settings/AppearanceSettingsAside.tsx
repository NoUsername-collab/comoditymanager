"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import { getDesignTheme } from "@/design/themes/catalog";
import { Link } from "@/i18n/navigation";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { localizedFromString } from "@/features/public-site/domain/localized";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import type { PublicThemeId } from "@/features/public-site/domain/types";
import "@/app/public-site-v2.css";

export function AppearanceSettingsAside({
  displayName,
}: {
  displayName: string;
}) {
  const t = useTranslations("admin.pages.settings");
  const tThemes = useTranslations("admin.pages.publicSite.themes");
  const { themeId, mode } = useAdminTheme();
  const theme = getDesignTheme(themeId);
  const publicThemeId = themeId as PublicThemeId;

  const previewConfig = useMemo(
    () => ({
      displayName,
      bookingEnabled: true,
      hero: {
        badge: localizedFromString(t("appearancePreviewPublicLead")),
        title: localizedFromString(displayName),
        subtitle: localizedFromString(t("appearancePreviewPublicLead")),
        tagline: localizedFromString(""),
        ctaPrimary: localizedFromString(t("appearancePreviewPublicCta")),
        ctaSecondary: localizedFromString(""),
        ctaPrimaryHref: "/calendar",
        ctaSecondaryHref: "#",
        showCheckTimes: false,
      },
    }),
    [displayName, t],
  );

  return (
    <div className="settings-appearance-aside">
      <p className="settings-appearance-aside__hint">{t("appearanceAdminHint")}</p>
      <p className="settings-appearance-aside__theme">
        {theme.name} · {mode === "day" ? t("appearanceModeDay") : t("appearanceModeNight")}
      </p>
      <p className="settings-appearance-aside__panel-label">{t("asOnSite")}</p>
      <div
        className={[
          "settings-appearance-aside__public-frame",
          "pub-site",
          publicThemeClassName(publicThemeId),
        ].join(" ")}
        style={resolvePublicThemeStyle(publicThemeId)}
      >
        <PublicHeroBlock
          config={previewConfig}
          locale="ro"
          variant="classic"
          preview
        />
      </div>
      <p className="settings-appearance-aside__theme-note">
        {tThemes(`${publicThemeId}.title`)} — {tThemes(`${publicThemeId}.desc`)}
      </p>
      <Link href="/admin/settings/public-site" className="settings-appearance-aside__link">
        {t("appearancePublicLink")} →
      </Link>
    </div>
  );
}
