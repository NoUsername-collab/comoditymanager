"use client";

import { CATALOG_PALETTES, tokensFor } from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";

function ZoneStrip() {
  const palette = CATALOG_PALETTES[0]!;
  const { mode } = useAdminTheme();
  const t = tokensFor(palette, mode);

  return (
    <div className="admin-palette-zones" title={mode === "day" ? "Zi" : "Noapte"}>
      <span className="admin-palette-zones__checkout h-full" style={{ background: t.ganttZoneCheckout }} />
      <span
        className="admin-palette-zones__clean h-full"
        style={{
          background: `repeating-linear-gradient(-45deg, ${t.ganttZoneClean}, ${t.ganttZoneClean} 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 6px)`,
        }}
      />
      <span className="admin-palette-zones__checkin h-full" style={{ background: t.ganttZoneCheckin }} />
    </div>
  );
}

export function AdminPalettePicker() {
  const { apply, mode } = useAdminTheme();

  return (
    <div className="admin-palette-picker">
      <input type="hidden" name="admin_palette_source" value="catalog" />
      <input type="hidden" name="admin_palette_key" value="default" />
      <input type="hidden" name="admin_day_night" value={mode} />

      <div className="admin-palette-block">
        <p className="admin-palette-block__desc">
          Toate temele alternative au fost scoase. Rămâne activ doar scheletul{" "}
          <code className="text-xs">default</code>, cu variante Zi și Noapte pe același
          pattern pentru extensiile viitoare.
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
              {nextMode === "day" ? "Zi" : "Noapte"}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <p className="admin-palette-extend__mode-label">Preview default</p>
          <ZoneStrip />
        </div>
      </div>
    </div>
  );
}
