"use client";

import { useState } from "react";
import { CATALOG_PALETTES, tokensFor } from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import type { AdminTheme } from "@/lib/admin-theme";
import type { ThemeId } from "@/lib/themes";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import type { AdminPaletteDefinition } from "@/lib/admin-palettes/types";

function ZoneStrip({
  palette,
  mode,
  compact,
}: {
  palette: AdminPaletteDefinition;
  mode: AdminTheme;
  compact?: boolean;
}) {
  const t = tokensFor(palette, mode);
  return (
    <div
      className={[
        "admin-palette-zones",
        compact && "admin-palette-zones--compact",
      ]
        .filter(Boolean)
        .join(" ")}
      title={mode === "day" ? "Zi" : "Noapte"}
    >
      <span
        className="admin-palette-zones__checkout h-full"
        style={{ background: t.ganttZoneCheckout }}
      />
      <span
        className="admin-palette-zones__clean h-full"
        style={{
          background: `repeating-linear-gradient(-45deg, ${t.ganttZoneClean}, ${t.ganttZoneClean} 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 6px)`,
        }}
      />
      <span
        className="admin-palette-zones__checkin h-full"
        style={{ background: t.ganttZoneCheckin }}
      />
    </div>
  );
}

function ExtendedPalettePreview({ palette }: { palette: AdminPaletteDefinition }) {
  return (
    <div className="admin-palette-extend">
      <p className="admin-palette-extend__desc">{palette.description}</p>
      <div className="admin-palette-extend__modes">
        {(["day", "night"] as const).map((mode) => {
          const t = tokensFor(palette, mode);
          return (
            <div key={mode}>
              <p className="admin-palette-extend__mode-label">
                {mode === "day" ? "☀️ Zi" : "🌙 Noapte"}
              </p>
              <ZoneStrip palette={palette} mode={mode} />
              <div className="admin-palette-tokens mt-2">
                {(
                  [
                    ["Fundal", t.pageBg],
                    ["Panou", t.panelBg],
                    ["Accent", t.accent],
                    ["Text", t.text],
                  ] as const
                ).map(([label, color]) => (
                  <div key={label} className="admin-palette-token">
                    <div
                      className="admin-palette-token__swatch"
                      style={{ background: color }}
                    />
                    <p className="admin-palette-token__label">{label}</p>
                  </div>
                ))}
              </div>
              <div
                className="admin-palette-extend__hud mt-2"
                style={{ background: t.hudGradient }}
                title="HUD / header"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaletteThemeRow({
  palette,
  selected,
  expanded,
  onToggleExpand,
  onSelect,
}: {
  palette: AdminPaletteDefinition;
  selected: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className={[
        "admin-palette-theme",
        selected && "admin-palette-theme--selected",
        expanded && "admin-palette-theme--open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="admin-palette-theme__head"
        aria-expanded={expanded}
        onClick={onToggleExpand}
      >
        <span className="admin-palette-theme__name">{palette.name}</span>
        {!expanded && (
          <span className="admin-palette-theme__strip">
            <ZoneStrip palette={palette} mode="day" compact />
          </span>
        )}
        {selected && (
          <span className="admin-palette-theme__badge">Activ</span>
        )}
        <span className="admin-palette-theme__chevron" aria-hidden>
          ▾
        </span>
      </button>

      <div
        className={[
          "admin-palette-theme__body",
          expanded && "admin-palette-theme__body--open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="admin-palette-theme__inner">
          <ExtendedPalettePreview palette={palette} />
          {!selected && (
            <button
              type="button"
              className="admin-palette-extend__apply mt-3"
              onClick={onSelect}
            >
              Alege această temă
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminPalettePicker({
  defaultSettings,
}: {
  defaultSettings: {
    admin_palette_key: ThemeId;
    admin_day_night: AdminTheme;
  };
}) {
  const [paletteKey, setPaletteKey] = useState<ThemeId>(
    defaultSettings.admin_palette_key
  );
  const [dayNight, setDayNight] = useState<AdminTheme>(
    defaultSettings.admin_day_night
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    defaultSettings.admin_palette_key
  );

  const { applySettings, settings } = useAdminTheme();

  const activePalette =
    CATALOG_PALETTES.find((p) => p.id === settings.admin_palette_key) ??
    CATALOG_PALETTES[0]!;

  const preview = (next: { admin_palette_key?: ThemeId; admin_day_night?: AdminTheme }) => {
    applySettings({
      admin_palette_source: "catalog",
      admin_palette_key: next.admin_palette_key ?? paletteKey,
      admin_day_night: next.admin_day_night ?? dayNight,
    });
  };

  const selectPalette = (id: ThemeId) => {
    setPaletteKey(id);
    setExpandedId(id);
    preview({ admin_palette_key: id });
  };

  return (
    <div className="admin-palette-picker">
      <input type="hidden" name="admin_palette_source" value="catalog" />
      <input type="hidden" name="admin_palette_key" value={paletteKey} />
      <input type="hidden" name="admin_day_night" value={dayNight} />

      <SettingsSlidePanel
        title="Mod zi / noapte"
        subtitle={
          dayNight === "day"
            ? "Aspect luminos activ"
            : "Aspect întunecat activ"
        }
        icon={dayNight === "day" ? "☀️" : "🌙"}
        defaultOpen
      >
        <div className="admin-palette-block">
          <p className="admin-palette-block__desc">
            Fiecare temă are variantă Zi și Noapte — stilul vine din CSS modular (
            <code className="text-xs">data-theme</code> +{" "}
            <code className="text-xs">data-mode</code>).
          </p>
          <div className="admin-palette-daynight">
            {(["day", "night"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setDayNight(m);
                  preview({ admin_day_night: m });
                }}
                className={[
                  "admin-palette-daynight__btn",
                  dayNight === m && "admin-palette-daynight__btn--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {m === "day" ? "☀️ Zi" : "🌙 Noapte"}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <p className="admin-palette-extend__mode-label">Tema activă</p>
            <ZoneStrip palette={activePalette} mode={dayNight} />
          </div>
        </div>
      </SettingsSlidePanel>

      <SettingsSlidePanel
        title="Temă"
        subtitle={`${activePalette.name} · Default · Win95 · XP Classic`}
        icon="✨"
        badge={
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
            {CATALOG_PALETTES.length} teme
          </span>
        }
        defaultOpen
      >
        <div className="admin-palette-list">
          {CATALOG_PALETTES.map((p) => (
            <PaletteThemeRow
              key={p.id}
              palette={p}
              selected={paletteKey === p.id}
              expanded={expandedId === p.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === p.id ? null : p.id))
              }
              onSelect={() => selectPalette(p.id)}
            />
          ))}
        </div>
      </SettingsSlidePanel>
    </div>
  );
}
