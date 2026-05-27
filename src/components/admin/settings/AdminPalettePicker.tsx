"use client";

import { useTranslations } from "next-intl";
import { CATALOG_PALETTES, tokensFor } from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";

function ZoneStrip() {
  const palette = CATALOG_PALETTES[0]!;
  const { mode } = useAdminTheme();
  const tPalette = useTranslations("admin.settings.palette");
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
  const { apply, mode } = useAdminTheme();
  const t = useTranslations("admin.settings.palette");

  return (
    <div className="admin-palette-picker">
      <input type="hidden" name="admin_palette_source" value="catalog" />
      <input type="hidden" name="admin_palette_key" value="default" />
      <input type="hidden" name="admin_day_night" value={mode} />

      <div className="admin-palette-block">
        <p className="admin-palette-block__desc">
          {t("descriptionPrefix")} <code className="text-xs">default</code>,{" "}
          {t("descriptionSuffix")}
        </p>

        <div className="admin-palette-daynight">
          {(["day", "night"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => apply("default", nextMode)}
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
          <p className="admin-palette-extend__mode-label">{t("previewDefault")}</p>
          <ZoneStrip />
        </div>
      </div>
    </div>
  );
}
