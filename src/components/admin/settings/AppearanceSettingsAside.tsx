"use client";

import { useTranslations } from "next-intl";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import { getDesignTheme } from "@/design/themes/catalog";
import { adminThemeCssVars } from "@/design/themes/admin";
import { Link } from "@/i18n/navigation";
import { resolvePublicThemeStyle } from "@/features/public-site/themes/loader";
import type { PublicThemeId } from "@/features/public-site/domain/types";

export function AppearanceSettingsAside({
  publicThemeId,
}: {
  publicThemeId: PublicThemeId;
}) {
  const t = useTranslations("admin.pages.settings");
  const { themeId, mode } = useAdminTheme();
  const theme = getDesignTheme(themeId);

  return (
    <div className="settings-appearance-aside">
      <p className="settings-appearance-aside__hint">{t("appearanceAdminHint")}</p>
      <p className="settings-appearance-aside__theme">
        {theme.name} · {mode === "day" ? t("appearanceModeDay") : t("appearanceModeNight")}
      </p>

      <div className="settings-appearance-aside__dual">
        <div>
          <p className="settings-appearance-aside__panel-label">
            {t("appearancePreviewAdmin")}
          </p>
          <div
            className="settings-appearance-aside__admin-mock"
            style={adminThemeCssVars(themeId, mode) as React.CSSProperties}
          >
            <div className="settings-appearance-aside__admin-bar" />
            <div className="settings-appearance-aside__admin-cards">
              <span />
              <span />
            </div>
          </div>
        </div>

        <div>
          <p className="settings-appearance-aside__panel-label">
            {t("appearancePreviewPublic")}
          </p>
          <div
            className="settings-appearance-aside__public-mock"
            style={resolvePublicThemeStyle(publicThemeId)}
          >
            <p className="settings-appearance-aside__public-badge">
              {t("appearancePreviewPublicLead")}
            </p>
            <p className="settings-appearance-aside__public-title">
              {t("appearancePreviewPublicCta")}
            </p>
            <span className="settings-appearance-aside__public-cta">
              {t("appearancePreviewPublicButton")}
            </span>
          </div>
        </div>
      </div>

      <Link href="/admin/settings/public-site" className="settings-appearance-aside__link">
        {t("appearancePublicLink")} →
      </Link>
    </div>
  );
}
