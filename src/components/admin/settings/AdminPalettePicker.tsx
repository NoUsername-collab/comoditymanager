"use client";

import { useTranslations } from "next-intl";
import { DESIGN_THEME_IDS, getDesignTheme } from "@/design/themes/catalog";
import { publicPreviewStyle } from "@/design/themes/admin";
import { CATALOG_PALETTES, tokensFor } from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import type { ThemeId } from "@/lib/themes";

function ZoneStrip({ themeId }: { themeId: ThemeId }) {
  const palette = CATALOG_PALETTES.find((p) => p.id === themeId) ?? CATALOG_PALETTES[0]!;
  const { mode } = useAdminTheme();
  const tPalette = useTranslations("admin.common.palette");
  const tokens = tokensFor(palette, mode);

  return (
    <div className="admin-palette-zones" title={mode === "day" ? tPalette("day") : tPalette("night")}>
      <span className="admin-palette-zones__checkout h-full" style={{ background: tokens.ganttZoneCheckout }} />
      <span
        className="admin-palette-zones__clean h-full"
        style={{
          background: `repeating-linear-gradient(-45deg, ${tokens.ganttZoneClean}, ${tokens.ganttZoneClean} 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 6px)`,
        }}
      />
      <span className="admin-palette-zones__checkin h-full" style={{ background: tokens.ganttZoneCheckin }} />
    </div>
  );
}

export function AdminPalettePicker() {
  const { apply, mode, themeId } = useAdminTheme();
  const t = useTranslations("admin.common.palette");
  const tPublic = useTranslations("admin.pages.publicSite.themes");

  return (
    <div className="admin-palette-picker">
      <input type="hidden" name="admin_palette_source" value="catalog" />
      <input type="hidden" name="admin_palette_key" value={themeId} />
      <input type="hidden" name="admin_day_night" value={mode} />

      <div className="admin-palette-block">
        <p className="admin-palette-block__desc">{t("familyDescription")}</p>

        <div className="pub-settings-grid pub-settings-grid--3">
          {DESIGN_THEME_IDS.map((id) => {
            const def = getDesignTheme(id);
            const active = themeId === id;
            return (
              <button
                key={id}
                type="button"
                className={["pub-settings-card", active && "pub-settings-card--active"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => apply(id, mode)}
              >
                <span
                  className="mb-2 block h-10 w-full rounded-md border"
                  style={publicPreviewStyle(id)}
                  aria-hidden
                />
                <p className="pub-settings-card__title">{tPublic(`${id}.title`)}</p>
                <p className="pub-settings-card__desc">{tPublic(`${id}.desc`)}</p>
              </button>
            );
          })}
        </div>

        <div className="admin-palette-daynight mt-4">
          {(["day", "night"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => apply(themeId, nextMode)}
              className={[
                "admin-palette-daynight__btn",
                mode === nextMode && "admin-palette-daynight__btn--active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {nextMode === "day" ? t("day") : t("night")}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <p className="admin-palette-extend__mode-label">
            {t("previewTheme", { theme: getDesignTheme(themeId).name })}
          </p>
          <ZoneStrip themeId={themeId} />
        </div>
      </div>
    </div>
  );
}
