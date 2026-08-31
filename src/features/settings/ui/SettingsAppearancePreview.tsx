"use client";

import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import { CATALOG_PALETTES } from "@/lib/admin-palettes";
import { useTranslations } from "next-intl";

export function SettingsAppearancePreview() {
  const t = useTranslations("admin.pages.settings.preview");
  const { themeId, mode } = useAdminTheme();
  const palette =
    CATALOG_PALETTES.find((entry) => entry.id === themeId) ?? CATALOG_PALETTES[0]!;
  const tokens = mode === "day" ? palette.day : palette.night;

  return (
    <div className="settings-live-preview settings-live-preview--appearance">
      <p className="settings-live-preview__eyebrow">{t("appearanceEyebrow")}</p>
      <p className="settings-live-preview__title">{palette.name}</p>
      <p className="settings-live-preview__subtitle">
        {mode === "day" ? t("modeDay") : t("modeNight")}
      </p>
      <div
        className="settings-live-preview__palette-strip"
        aria-hidden
        style={{
          background: `linear-gradient(90deg, ${tokens.ganttZoneCheckout} 34%, ${tokens.ganttZoneClean} 34% 64%, ${tokens.ganttZoneCheckin} 64%)`,
        }}
      />
      <div className="settings-live-preview__swatches" aria-hidden>
        {[
          { label: t("swatchCheckout"), color: tokens.ganttZoneCheckout },
          { label: t("swatchClean"), color: tokens.ganttZoneClean },
          { label: t("swatchCheckin"), color: tokens.ganttZoneCheckin },
        ].map((swatch) => (
          <span key={swatch.label} className="settings-live-preview__swatch">
            <span
              className="settings-live-preview__swatch-color"
              style={{ background: swatch.color }}
            />
            <span className="settings-live-preview__swatch-label">{swatch.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
